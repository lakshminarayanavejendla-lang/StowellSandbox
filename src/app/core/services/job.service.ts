import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GlobalEndpoints } from '../global-endpoints';
import { CurrentJob } from '../models/current-job.model';
import { ChartData } from '../models/chart-data.model';

/**
 * Ported from JobService.cs. Blazor read the user's email on the server. Here MsalInterceptor adds
 * the sign-in token, and the API should read the user from it. Ask the API team whether routes like
 * GetCurrentJobs/{email} still need the email in the URL.
 */
@Injectable({ providedIn: 'root' })
export class JobService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /** A short cache so the dashboard cards and charts share one request. */
  private cache = new Map<string, { at: number; stream: Observable<unknown> }>();
  private static readonly CACHE_MS = 45_000;

  private cached<T>(key: string, load: () => Observable<T>): Observable<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < JobService.CACHE_MS) return hit.stream as Observable<T>;
    const stream = load().pipe(shareReplay(1));
    this.cache.set(key, { at: Date.now(), stream });
    return stream;
  }

  getCurrentJobs(email: string): Observable<CurrentJob[]> {
    return this.http
      .get<CurrentJob[]>(`${this.base}${GlobalEndpoints.GetCurrentJobsUrl}/${email}`)
      .pipe(catchError(() => of([])));
  }

  getCashCollectedDatasets(): Observable<ChartData[]> {
    return this.cached('cash', () =>
      this.http.get<ChartData[]>(`${this.base}${GlobalEndpoints.GetCashCollectedDatasetsUrl}`).pipe(catchError(() => of([] as ChartData[])))
    );
  }

  getSampleChartDatasets(email: string): Observable<ChartData[]> {
    return this.cached(`retain:${email}`, () =>
      this.http.get<ChartData[]>(`${this.base}${GlobalEndpoints.GetSampleChartDatasetsUrl}/${email}`).pipe(catchError(() => of([] as ChartData[])))
    );
  }

  getNetCashChart(): Observable<ChartData[]> {
    return this.cached('netcash', () =>
      this.http.get<ChartData[]>(`${this.base}${GlobalEndpoints.GetNetCashChartUrl}`).pipe(catchError(() => of([] as ChartData[])))
    );
  }
}
