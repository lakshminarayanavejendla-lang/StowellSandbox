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
 * Ported from AdminPanelService.cs, for the Project Access Management grid. Like the C# code,
 * errors return an empty array or false instead of throwing.
 *
 * Security: insertProjectManagementUser and deleteProjectManagementUser grant and remove an
 * employee's role on a project. The Blazor code never checks the admin's own permissions first,
 * so make sure the server checks them before trusting the UI to control access.
 */
@Injectable({ providedIn: 'root' })
export class AdminPanelService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  // Part of the C# service, but nothing on the Admin Panel uses it. Ported for completeness.
  getProjectIds(): Observable<CostCodeRecord[]> {
    return this.http
      .get<CostCodeRecord[]>(`${this.base}${StowellAdminEndpoints.GetProjectIdsUrl}`)
      .pipe(catchError(() => of([])));
  }

  // Part of the C# service, but its only call is commented out. The page fills the Employee dropdown
  // from ContactService.getGroupUsers() for one fixed security group (see admin-panel.component.ts).
  // Nothing here calls it.
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

  // Security-sensitive: gives an employee a role on a project (see the note at the top).
  insertProjectManagementUser(user: ProjectManagementUser): Observable<boolean> {
    return this.http
      .post<boolean>(`${this.base}${StowellAdminEndpoints.InsertProjectManagementUserUrl}`, user)
      .pipe(catchError(() => of(false)));
  }

  // Security-sensitive: removes an employee from a project (see the note at the top).
  deleteProjectManagementUser(jobNumber: number, emailId: string): Observable<boolean> {
    const params = `jobNumber=${jobNumber}&emailId=${encodeURIComponent(emailId)}`;
    return this.http
      .delete<boolean>(`${this.base}${StowellAdminEndpoints.DeleteProjectManagementUserUrl}?${params}`)
      .pipe(catchError(() => of(false)));
  }
}
