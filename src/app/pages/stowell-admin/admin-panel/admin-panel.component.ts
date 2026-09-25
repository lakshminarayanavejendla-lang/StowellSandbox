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

// UI-only grouping of assignments by project (job number), plus an optional inline "add
// assignment" Reactive Form - mirrors what AdminPanelBase.cs does with
// `_projectManagementUsers = apiData.GroupBy(x => x.JobNumber)...`, and its per-project
// "one in-progress new row at a time" (`if (project.Assignments.Any(a => a.IsNew)) return;`).
// Deliberately kept OUT of ProjectManagementUser (core/models/stowell-admin/project-management-user.model.ts)
// per that model file's header comment - none of this state round-trips through the API.
interface ProjectGroup {
  jobNumber: number;
  assignments: ProjectManagementUser[];
  expanded: boolean;
  addForm: FormGroup | null;
}

/**
 * Port of AdminPanel.razor / AdminPanelBase.cs (@page "/StowellAdmin/AdminPanel") -
 * "Project Access Management": a per-project grid of (role, employee) assignments, with
 * inline add/save/cancel/delete. RadzenDataGrid (parent + nested child grid, single-row-expand)
 * replaced with a plain expandable HTML table; the inline "add assignment" row uses Angular
 * Reactive Forms (one FormGroup per project, created on "Add" and destroyed on Save/Cancel),
 * per this codebase's established convention (no template-driven ngModel, no modal library).
 *
 * SECURITY-RELEVANT, please read before trusting this page for real access changes:
 * 1. FIX (2026-09-16) - the "Employee" dropdown used to be sourced from
 *    ContactService.getGroupUsers() scoped to one hardcoded security-group GUID
 *    (`21e5091d-cb71-4bdb-8d63-f98d8bce3017`, reproduced from AdminPanelBase.OnAfterRenderAsync),
 *    which only had 5 members locally - reported as "not all users there" when trying to grant
 *    project access. Switched to AdminPanelService.getAdminPanelUsers() (dbo.StowellUsers, the
 *    real employee roster - 92 rows locally), which is what this class's own earlier flag here
 *    already suspected was the intended source (see stowell-user.model.ts's header comment: it's
 *    part of IAdminPanelService's real contract, just never wired up in the original Blazor page).
 * 2. `getUserRoles()` returns the full assignable-role list with NO filtering by the calling
 *    admin's own permissions (same flag as project-role.model.ts) - confirm server-side that
 *    role-granting is itself authorization-checked, since this client only checks "is a role
 *    selected", not "is the current user allowed to grant it".
 * 3. Save/Delete call insertProjectManagementUser/deleteProjectManagementUser directly with no
 *    extra client-side confirmation step (matching the Blazor source, which also has none for
 *    save; delete likewise has no confirm() in the source). Left as-is to match source behavior,
 *    unlike DisconnectUsers where a confirm() was deliberately added - flagging the inconsistency
 *    in case you want a confirm step here too before shipping.
 *
 * SYNCFUSION GRID SWAP (replacing the free plain-<table> stand-in described above):
 * - Outer "one row per project" table -> a Syncfusion Grid bound to the same `pagedProjectGroups`
 *   slice this component already computes (custom search + page-size pager kept exactly as-is,
 *   NOT replaced by Grid's own PageService/Search toolbar item, so the existing "All" page-size
 *   option and search-by-assignment-email behavior aren't lost). The expand/collapse arrow is a
 *   column `template` calling the existing `toggleExpand()`.
 * - Deliberately NOT using Grid's own master-detail `detailTemplate`/DetailRowService for the
 *   per-project assignments panel: enforcing "only one project expanded at a time" (mirroring the
 *   source's RadzenDataGrid ExpandMode.Single) would need calling into that feature's row
 *   expand/collapse API, and this project isn't fully certain of those method names on
 *   ej2-angular-grids 27.1.x without being able to `ng build` and check. Instead, the expanded
 *   group's assignments panel is rendered as its own section right after the Grid (still governed
 *   by this component's own `expanded` flag/`toggleExpand()`, unchanged) - a real but purely
 *   visual difference from the old nested-<tr>-directly-under-the-project-row layout, flagged
 *   here rather than silently changed.
 * - Inner assignments table -> a second Syncfusion Grid bound to `group.assignments`, with an
 *   "Actions" column `template` for the delete button (per the task's "column templates for
 *   editable cells/action buttons" instruction).
 * - The inline "add assignment" Reactive Form (`group.addForm`) is NOT turned into a fake/virtual
 *   Grid row: it isn't part of `group.assignments` (the bound data), and Syncfusion Grid's
 *   supported way to edit/add rows in-place (Normal/Batch/Dialog edit modes) would mean giving up
 *   this codebase's established per-row FormGroup pattern for Grid's own edit template hooks -
 *   a bigger behavioral rewrite than "swap the markup, keep the behavior" calls for. Instead the
 *   exact same `[formGroup]="group.addForm"` markup (dropdowns + Save/Cancel) is kept, just moved
 *   to sit directly above the assignments Grid instead of inside its first `<tr>`. Flagging this
 *   as the one deliberate structural change in this component; all FormGroup/service-call logic
 *   in the class below is untouched.
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

  // FIX - assignments grid showing "No records to display" after a save/delete even though its
  // dataSource array is correctly updated: Syncfusion's ejs-grid Angular wrapper renders the
  // rows it's handed at creation time, but doesn't reliably re-render when [dataSource] is
  // reassigned to a new array afterward (reproduced with real data both on this local dev server
  // and the deployed build - dataSource/currentViewData report the right row count, but no .e-row
  // elements exist in the DOM). Explicitly calling refresh() on the live grid instance(s) after
  // any data change works around it. Only one project is ever expanded at a time (single-expand
  // mode), so there's at most one ejs-grid in the DOM, but ViewChildren covers it regardless of
  // that assumption changing later.
  @ViewChildren(GridComponent) private grids!: QueryList<GridComponent>;

  private refreshGrids(): void {
    // ViewChildren reflects the post-render DOM, but the assignments grid for a just-expanded/
    // just-reloaded group may not have finished rendering the very same tick detectChanges() ran
    // in - defer one macrotask so the grid instance actually exists before calling refresh() on it.
    setTimeout(() => {
      this.grids?.forEach((grid) => grid.refresh());
    });
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadProjectEmails();
  }

  // FIX (2026-09-16) - the "Employee" dropdown was scoped to ONE hardcoded security-group GUID
  // (`21e5091d-cb71-4bdb-8d63-f98d8bce3017`) via ContactService.getGroupUsers(), which only had 5
  // members locally - nowhere near the real Stowell employee roster, and the reason "not all
  // users" showed up when granting project access. Switched to
  // AdminPanelService.getAdminPanelUsers() (dbo.StowellUsers, 92 rows locally) - this is the
  // source the class header's flag #1 already called out as the likely intended one
  // (GetAdminPanelUsers is part of IAdminPanelService's real contract; the group-lookup was a
  // stand-in the original Blazor source used instead, per that method's own "commented out" call
  // site flagged in stowell-user.model.ts).
  private loadLookups(): void {
    this.adminPanelService.getAdminPanelUsers().subscribe((users) => {
      this.stowellUsers = users;
    });

    this.adminPanelService.getUserRoles().subscribe((roles) => {
      this.projectRoles = roles;
    });
  }

  // FIX (2026-09-16) - was fed only from getProjectEmails() (dbo.ProjectManagementUsers), so a
  // project with zero assignments so far - e.g. one just created via Win Bid - never appeared
  // here at all: there was no group to expand and add a first assignment to (the "Add Line"
  // form only exists per-group, on an already-rendered row). Now also loads getProjectIds() -
  // the REAL full project list (StowellSandbox.dbo.actrec, same source Project Queue uses; see
  // AdminPanelController.GetProjectIds's header comment for the DB-name bug that was also fixed
  // there) - and unions it with the assignment rows so every real project gets a group, with an
  // empty `assignments` array when nobody's been granted access yet.
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
    // Ensure every real project has a group, even with no assignments yet.
    for (const project of allProjects) {
      if (!byJob.has(project.recNum)) {
        byJob.set(project.recNum, []);
      }
    }
    // Preserve previous expanded state across a reload so Save/Delete don't visually collapse
    // the row the admin is actively working in.
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

  // FIX - was a getter (`get pagedProjectGroups()`) bound directly to the Grid's [dataSource].
  // Angular re-evaluates a getter on EVERY change-detection cycle, so the Grid was handed a
  // brand-new array (from .slice()) dozens of times a second even when nothing actually changed
  // - Syncfusion Grid treats a new array reference as new data and re-renders/resets itself
  // accordingly. That churn was the real cause of "expand not working": a re-render triggered
  // mid-click could wipe out the very click event that was supposed to fire toggleExpand(), or
  // reset the row before its (click) handler ran. Now a plain field, only reassigned when the
  // underlying page/filter/data genuinely changes.
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
    // NOTE: AdminPanelBase.cs's FilterJobs() filters on `j.JobNumber` OR `j.EmailId` of the
    // *grouped* parent object - but the parent object's EmailId is never set (only JobNumber +
    // Assignments are assigned when building the group), so the "search by email" half of that
    // filter is dead code in the source (always null, never matches). Reproduced the JobNumber
    // half faithfully but additionally search each group's assignment emails too, since a search
    // box next to an "email"-shaped filter that silently never works seems like a bug rather
    // than intentional - flagging this as a deliberate improvement over the literal source.
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

  // FIX - expand not working, then opening at the bottom of the page: the outer list used to
  // be an <ejs-grid> with this method wired to its (recordClick) - see the .html file's header
  // comment for why the outer list is a plain <table> now instead, with (click) directly on
  // each <tr>. toggleExpand() itself is unchanged; only what calls it moved.
  toggleExpand(group: ProjectGroup): void {
    // ngZone.run()/detectChanges(): a plain <tr> (click) is a completely standard Angular
    // binding and doesn't strictly need this, but kept as cheap insurance since this component
    // already had a real zone-related bug once (see project-management module's other fixes
    // this session for the same class of issue) and the inner assignments Grid's
    // (recordClick) -> deleteAssignment() path still benefits from it.
    this.ngZone.run(() => {
      // Mirrors RadzenDataGrid's ExpandMode.Single - only one project's assignments open at once.
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

  // FIX - delete not working: see admin-panel.component.html's comment on the inner
  // assignments <ejs-grid>. Only acts when the click landed in the "Actions" column - clicking
  // Role/Employee cells does nothing (this grid has no other click behavior to conflict with).
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
