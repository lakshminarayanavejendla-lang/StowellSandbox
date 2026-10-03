// Ported from the C# GlobalEndpoints class. Keep the two in sync so both apps call the same API
// routes. Only the shell and dashboard routes are here; each module keeps its own routes file.
export const GlobalEndpoints = {
  GetCurrentJobsUrl: 'api/PmHome/GetCurrentJobs',
  GetChartDatasetsUrl: 'api/PmHome/GetChartDatasets',
  GetCashCollectedDatasetsUrl: 'api/PmHome/GetCashCollectedDatasets',
  GetSampleChartDatasetsUrl: 'api/PmHome/GetSampleChartDatasets',
  GetNetCashChartUrl: 'api/PmHome/GetNetCashChart',
  GetCalendarEventsUrl: 'api/PmHome/GetCalendarEvents',
  CreateCalendarEventUrl: 'api/PmHome/CreateCalendarEvent',
} as const;
