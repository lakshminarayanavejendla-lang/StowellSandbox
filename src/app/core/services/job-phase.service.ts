import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { JobPhaseOption } from '../models/project-management/job-phase.model';

/**
 * Fills the Phase dropdown on the CO Reallocation form with the selected job's Sage phases
 * (PoQueueController.GetJobPhases/{jobId}, which runs PO_GetJobPhases). Works like
 * JobCostCodeService does for cost codes.
 *
 * Two fixes for "It's not pulling in phases. Phases are getting duplicated" (Mike Smith, 2026-09-20):
 *  - A new project, such as one just converted from a bid, has no jobphs rows until its first
 *    budget upload. When the job has no phases, this falls back to the full phase list
 *    (api/CostCode/GetAllPhases) so a phase can still be picked.
 *  - The budget Update sheet can write the same job and phase more than once (see
 *    StowellCoAPI_DB_Changes_2026-09-20.sql), so phases are reduced to one per number.
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

  /** Every phase, not just this job's. Used when the job has none of its own yet. */
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
