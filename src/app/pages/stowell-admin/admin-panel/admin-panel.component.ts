import { Component, OnInit, inject, ChangeDetectorRef, NgZone, ViewChildren, QueryList } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { GridModule, GridComponent, SortService, RecordClickEventArgs } from '@syncfusion/ej2-angular-grids';
import { AdminPanelService } from '../../../core/services/admin-panel.service';
import { ProjectManagementUser } from '../../../core/models/stowell-admin/project-management-user.model';
import { ProjectRole } from '../../../core/models/stowell-admin/project-role.model';
import { CostCodeRecord } from '../../../core/models/stowell-admin/cost-code-record.model';
import { StowellUser } from '../../../core/models/stowell-admin/stowell-user.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

// Assignments grouped by project (job number), plus an optional add-assignment form, as
// AdminPanelBase.cs does with GroupBy(x => x.JobNumber). Each project allows one new row at a time.
// This is UI state only, so it isn't on ProjectManagementUser (see project-management-user.model.ts).
interface ProjectGroup {
  jobNumber: number;
  assignments: ProjectManagementUser[];
  expanded: boolean;
  addForm: FormGroup | null;
}

/**
 * Project Access Management (/StowellAdmin/AdminPanel in Blazor): each project's role and employee
 * assignments, with add, save, cancel and delete. The add row uses a reactive FormGroup per project,
 * created on Add and removed on Save or Cancel.
 *
 * Security, read before trusting this page for real access changes:
 * 1. The Employee dropdown used to come from one fixed security group, which had only 5 members, so
 *    "not all users" showed up (2026-09-16). It now uses getAdminPanelUsers() (dbo.StowellUsers, the
 *    full employee list, 92 rows locally). Blazor had that call commented out (see stowell-user.model.ts).
 * 2. getUserRoles() returns every role, whatever the admin's own permissions. This page only checks
 *    that a role was picked, so the server must check who can grant what.
 * 3. Save and Delete call the API straight away with no confirmation, like Blazor. Disconnect Users
 *    does ask first, so you may want a confirmation here too.
 *
 * Layout: the project list is a plain table (see the .html header), with its own search and
 * page-size pager, including "All" and search by assignment email. Only one project opens at a
 * time, like Blazor's single-expand grid, and its panel opens right under its row. The assignments are a
 * Syncfusion grid with a delete button in the Actions column. The add form sits above that grid
 * instead of as a fake grid row, so it keeps the same FormGroup code.
 */
@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [ReactiveFormsModule, GridModule, PageHeaderComponent],
  providers: [SortService],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss',
})
export class AdminPanelComponent implements OnInit {
  private adminPanelService = inject(AdminPanelService);
  private fb = inject(FormBuilder);

  projectGroups: ProjectGroup[] = [];
  filteredProjectGroups: ProjectGroup[] = [];
  stowellUsers: StowellUser[] = [];
  projectRoles: ProjectRole[] = [];

  searchTerm = '';
  pageSize = 15;
  pageSizeOptions = [10, 15, 20, 50];
  currentPage = 0;

  errorMessage = '';
  successMessage = '';

  // After a save or delete the assignments grid could show "No records to display" even though its
  // data was right: the Syncfusion grid doesn't always re-render when [dataSource] gets a new array.
  // Calling refresh() on it after each change fixes that. Only one project is open at a time, so
  // there's at most one grid, but ViewChildren handles more.
  @ViewChildren(GridComponent) private grids!: QueryList<GridComponent>;

  private refreshGrids(): void {
    // A grid for a project that just opened or reloaded may not exist yet in this tick, so wait one
    // task before calling refresh().
    setTimeout(() => {
      this.grids?.forEach((grid) => grid.refresh());
    });
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadProjectEmails();
  }

  // The Employee dropdown uses getAdminPanelUsers() (dbo.StowellUsers, 92 rows locally). It used to
  // use one fixed security group with only 5 members, so "not all users" showed up (2026-09-16).
  private loadLookups(): void {
    this.adminPanelService.getAdminPanelUsers().subscribe((users) => {
      this.stowellUsers = users;
    });

    this.adminPanelService.getUserRoles().subscribe((roles) => {
      this.projectRoles = roles;
    });
  }

  // This also loads getProjectIds(), the full project list from StowellSandbox.dbo.actrec (the
  // same source as the Project Queue), and merges it with the assignments. Before, it only used
  // getProjectEmails(), so a project with no assignments yet, such as one just won from a bid, never
  // showed up and there was nowhere to add its first one (2026-09-16).
  private loadProjectEmails(): void {
    forkJoin({
      assignments: this.adminPanelService.getProjectEmails(),
      allProjects: this.adminPanelService.getProjectIds(),
    }).subscribe(({ assignments, allProjects }) => {
      this.projectGroups = this.groupByJobNumber(assignments, allProjects);
      this.applyFilter();
    });
  }

  private groupByJobNumber(rows: ProjectManagementUser[], allProjects: CostCodeRecord[]): ProjectGroup[] {
    const byJob = new Map<number, ProjectManagementUser[]>();
    for (const row of rows) {
      const list = byJob.get(row.jobNumber) ?? [];
      list.push(row);
      byJob.set(row.jobNumber, list);
    }
    // Every real project gets a group, even with no assignments yet.
    for (const project of allProjects) {
      if (!byJob.has(project.recNum)) {
        byJob.set(project.recNum, []);
      }
    }
    // Keep the open project open after a reload, so Save and Delete don't collapse the row you're working in.
    const previouslyExpanded = new Set(this.projectGroups.filter((g) => g.expanded).map((g) => g.jobNumber));
    return Array.from(byJob.entries())
      .sort(([a], [b]) => a - b)
      .map(([jobNumber, assignments]) => ({
        jobNumber,
        assignments,
        expanded: previouslyExpanded.has(jobNumber),
        addForm: null,
      }));
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.currentPage = 0;
    this.applyFilter();
  }

  onPageSizeChange(size: string): void {
    this.pageSize = size === 'All' ? (this.filteredProjectGroups.length || 1) : Number(size);
    this.currentPage = 0;
    this.refreshPagedGroups();
  }

  // This was a getter bound to the grid's [dataSource]. Angular runs getters on every change
  // detection, so the grid got a new array many times a second and kept re-rendering, which could
  // swallow the click that opens a row. It's a plain field now, set only when the page, filter or
  // data changes.
  pagedProjectGroups: ProjectGroup[] = [];

  private refreshPagedGroups(): void {
    const start = this.currentPage * this.pageSize;
    this.pagedProjectGroups = this.filteredProjectGroups.slice(start, start + this.pageSize);
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filteredProjectGroups.length / this.pageSize));
  }

  goToPage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 0), this.pageCount - 1);
    this.refreshPagedGroups();
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    // AdminPanelBase.cs filters on JobNumber or EmailId of the group, but the group's EmailId is never
    // set, so searching by email never worked. This searches the job number as Blazor did and also the
    // emails of each group's assignments. That's a deliberate improvement.
    this.filteredProjectGroups = !term
      ? this.projectGroups
      : this.projectGroups.filter(
          (g) =>
            g.jobNumber.toString().includes(term) ||
            g.assignments.some((a) => a.emailId?.toLowerCase().includes(term))
        );
    this.refreshPagedGroups();
    this.cdr.detectChanges(); // Force change detection after async data loads to avoid ExpressionChangedAfterItHasBeenCheckedError
    this.refreshGrids();
  }

  // The project list used to be an <ejs-grid> calling this from (recordClick). Rows didn't open, or
  // opened at the bottom of the page. It's a plain <table> with (click) on each row now (see the .html).
  toggleExpand(group: ProjectGroup): void {
    // A plain (click) doesn't really need ngZone.run() and detectChanges(), but they're cheap insurance
    // and the delete path from the inner grid's (recordClick) still needs them.
    this.ngZone.run(() => {
      // Only one project open at a time, like Blazor's single-expand grid.
      const willExpand = !group.expanded;
      for (const g of this.projectGroups) {
        if (g !== group) {
          g.expanded = false;
        }
      }
      group.expanded = willExpand;
      this.cdr.detectChanges();
      this.refreshGrids();
    });
  }

  addAssignment(group: ProjectGroup): void {
    if (group.addForm) {
      return; // one in-progress add per project at a time, matching the source's guard.
    }
    this.errorMessage = '';
    this.successMessage = '';
    group.addForm = this.fb.group({
      selectedRoleId: [null as number | null],
      selectedUserId: [null as string | null],
    });
  }

  cancelAssignment(group: ProjectGroup): void {
    group.addForm = null;
  }

  saveAssignment(group: ProjectGroup): void {
    const form = group.addForm;
    if (!form) {
      return;
    }
    const { selectedRoleId, selectedUserId } = form.value;
    if (selectedRoleId == null || selectedUserId == null) {
      return;
    }
    const user = this.stowellUsers.find((u) => u.id === selectedUserId);
    const role = this.projectRoles.find((r) => r.roleId === selectedRoleId);
    if (!user || !role) {
      return;
    }

    const toSave: ProjectManagementUser = {
      id: 0,
      jobNumber: group.jobNumber,
      emailId: user.email ?? '',
      userRole: role.roleId,
      userRoleName: role.roleName ?? '',
      dateAdded: new Date().toISOString(),
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.adminPanelService.insertProjectManagementUser(toSave).subscribe((success) => {
      if (success) {
        this.successMessage = 'Details Saved Successfully';
        group.addForm = null;
        this.loadProjectEmails();
      } else {
        this.errorMessage = 'Error while saving details.';
      }
    });
  }

  // Delete only acts when the click is in the Actions column (see the comment on the inner grid in
  // the .html). Clicking the Role or Employee cells does nothing.
  onAssignmentRecordClick(group: ProjectGroup, args: RecordClickEventArgs): void {
    if (args.column?.headerText !== 'Actions') return;
    const row = args.rowData as ProjectManagementUser | undefined;
    if (!row) return;
    this.deleteAssignment(group, row);
  }

  deleteAssignment(group: ProjectGroup, row: ProjectManagementUser): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.adminPanelService.deleteProjectManagementUser(group.jobNumber, row.emailId).subscribe((success) => {
      if (success) {
        group.assignments = group.assignments.filter((a) => a !== row);
        this.successMessage = 'Deleted Successfully';
        this.cdr.detectChanges();
        this.refreshGrids();
      } else {
        this.errorMessage = 'Error while deleting.';
      }
    });
  }
  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}
}
