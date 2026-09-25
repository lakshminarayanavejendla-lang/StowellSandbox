import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StowellAdminEndpoints } from '../stowell-admin-endpoints';
import { CostCodeRecord } from '../models/stowell-admin/cost-code-record.model';
import { StowellUser } from '../models/stowell-admin/stowell-user.model';
import { ProjectManagementUser } from '../models/stowell-admin/project-management-user.model';
import { ProjectRole } from '../models/stowell-admin/project-role.model';

/**
 * Port of IAdminPanelService/AdminPanelService.cs, which backs the "Project Access Management"
 * grid (AdminPanel.razor / AdminPanelBase.cs). Every C# method swallows exceptions and returns
 * an empty array/false rather than throwing - reproduced here via catchError(() => of([]/false)),
 * same convention as JobService/ContactService.
 *
 * SECURITY-RELEVANT: insertProjectManagementUser/deleteProjectManagementUser are real
 * access-control writes (grant/revoke an employee's role on a project). Nothing in the Blazor
 * source (AdminPanelBase.cs or this service) checks the *calling* admin's own permissions before
 * submitting - confirm server-side authorization exists on these endpoints before relying on the
 * UI alone to gate who can grant access.
 */
@Injectable({ providedIn: 'root' })
export class AdminPanelService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  // FLAG: confirmed part of IAdminPanelService's contract, but AdminPanelBase.cs never calls
  // this method and no grid/dropdown in AdminPanel.razor consumes CostCodeRecord - appears
  // orphaned in the source provided. Ported for completeness only.
  getProjectIds(): Observable<CostCodeRecord[]> {
    return this.http
      .get<CostCodeRecord[]>(`${this.base}${StowellAdminEndpoints.GetProjectIdsUrl}`)
      .pipe(catchError(() => of([])));
  }

  // FLAG: confirmed part of IAdminPanelService's contract, but the one call site
  // (AdminPanelBase.OnAfterRenderAsync) is commented out - the live page instead populates the
  // "Employee" dropdown via ContactService.getGroupUsers() scoped to a hardcoded security-group
  // id (see admin-panel.component.ts). Ported for completeness; not called by any component here.
  getAdminPanelUsers(): Observable<StowellUser[]> {
    return this.http
      .get<StowellUser[]>(`${this.base}${StowellAdminEndpoints.GetAdminPanelUsersUrl}`)
      .pipe(catchError(() => of([])));
  }

  getProjectEmails(): Observable<ProjectManagementUser[]> {
    return this.http
      .get<ProjectManagementUser[]>(`${this.base}${StowellAdminEndpoints.GetProjectEmailsUrl}`)
      .pipe(catchError(() => of([])));
  }

  getUserRoles(): Observable<ProjectRole[]> {
    return this.http
      .get<ProjectRole[]>(`${this.base}${StowellAdminEndpoints.GetUserRolesUrl}`)
      .pipe(catchError(() => of([])));
  }

  // SECURITY-RELEVANT: grants a (project, employee, role) assignment - see class header flag.
  insertProjectManagementUser(user: ProjectManagementUser): Observable<boolean> {
    return this.http
      .post<boolean>(`${this.base}${StowellAdminEndpoints.InsertProjectManagementUserUrl}`, user)
      .pipe(catchError(() => of(false)));
  }

  // SECURITY-RELEVANT: revokes a (project, employee) assignment - see class header flag.
  deleteProjectManagementUser(jobNumber: number, emailId: string): Observable<boolean> {
    const params = `jobNumber=${jobNumber}&emailId=${encodeURIComponent(emailId)}`;
    return this.http
      .delete<boolean>(`${this.base}${StowellAdminEndpoints.DeleteProjectManagementUserUrl}?${params}`)
      .pipe(catchError(() => of(false)));
  }
}
