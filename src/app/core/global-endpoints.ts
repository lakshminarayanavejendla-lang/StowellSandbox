// Direct port of StowellCoApp.Common.GlobalEndpoints - keep this in sync with the C# source
// so both front ends keep calling the same StowellCoAPI routes. Only the endpoints Phase 1
// (Shell + Dashboard) actually calls are ported here; add the rest module-by-module as each
// phase converts the page that uses them.
export const GlobalEndpoints = {
  GetCurrentJobsUrl: 'api/PmHome/GetCurrentJobs',
  GetChartDatasetsUrl: 'api/PmHome/GetChartDatasets',
  GetCashCollectedDatasetsUrl: 'api/PmHome/GetCashCollectedDatasets',
  GetSampleChartDatasetsUrl: 'api/PmHome/GetSampleChartDatasets',
  GetNetCashChartUrl: 'api/PmHome/GetNetCashChart',
  GetCalendarEventsUrl: 'api/PmHome/GetCalendarEvents',
} as const;
