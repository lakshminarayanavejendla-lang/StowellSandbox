import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { JobPhaseOption } from '../models/project-management/job-phase.model';

/**
 * NEW service - Stowell PO/CO Module. Backs the Phase dropdown on FORM-CO Reallocation. Backend:
 * PoQueueController.GetJobPhases/{jobId} -> SAGESBQ's PO_GetJobPhases, scoped to the selected
 * job's real Sage phases (mirrors JobCostCodeService's pattern for cost codes).
 *
 * FIX (2026-09-20, Mike Smith - "It's not pulling in phases. Phases are getting duplicated"):
 *  - A brand-new project (e.g. one just converted from a bid) has no StowellSandbox.dbo.jobphs rows
 *    until its first budget upload, so the job-scoped call returned nothing and the dropdown sat
 *    empty. When that happens this now falls back to the full phase list (api/CostCode/GetAllPhases,
 *    SAGESBQ's VWPhasesList) so a phase can still be picked.
 *  - Duplicate jobphs rows (same job + phase number, written more than once by the budget "Update"
 *    sheet - see StowellCoAPI_DB_Changes_2026-09-20.sql) are collapsed to one entry per phase number.
 */
@Injectable({ providedIn: 'root' })
export class JobPhaseService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getJobPhases(jobId: string): Observable<JobPhaseOption[]> {
    return this.http.get<JobPhaseOption[]>(`${this.base}api/PoQueue/GetJobPhases/${jobId}`).pipe(
      catchError(() => of([] as JobPhaseOption[])),
      map((phases) => this.distinct(phases)),
      switchMap((phases) => (phases.length ? of(phases) : this.getAllPhases()))
    );
  }

  /** Full phase list (not job-scoped) - the fallback for a job that has no phases of its own yet. */
  private getAllPhases(): Observable<JobPhaseOption[]> {
    type Row = { phaseNum?: string; phaseName?: string };
    return this.http.get<{ data?: Row[] } | Row[]>(`${this.base}${ProjectManagementEndpoints.GetAllPhasesUrl}`).pipe(
      map((res) => {
        const rows: Row[] = Array.isArray(res) ? res : res?.data ?? [];
        return this.distinct(
          rows
            .filter((r) => r.phaseNum != null && `${r.phaseNum}`.trim() !== '' && !Number.isNaN(Number(r.phaseNum)))
            .map((r) => ({ phaseNumber: Number(r.phaseNum), phaseName: (r.phaseName ?? '').trim() }))
        );
      }),
      catchError(() => of([] as JobPhaseOption[]))
    );
  }

  /** One entry per phase number; prefers a row that actually has a name over a blank one. */
  private distinct(phases: JobPhaseOption[]): JobPhaseOption[] {
    const seen = new Map<number, JobPhaseOption>();
    for (const p of phases ?? []) {
      const existing = seen.get(p.phaseNumber);
      if (!existing || (!existing.phaseName?.trim() && p.phaseName?.trim())) seen.set(p.phaseNumber, p);
    }
    return [...seen.values()].sort((a, b) => a.phaseNumber - b.phaseNumber);
  }
}
