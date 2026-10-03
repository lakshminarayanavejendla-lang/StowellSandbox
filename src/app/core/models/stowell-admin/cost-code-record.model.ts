// Matches CostCodeRecord in DTO/CodeCodeSummaryRecord.cs. Returned by GetProjectIds()
// (api/AdminPanel/GetProjectIds, GlobalEndpoints.GetProjectIdsUrl).
//
// Nothing on the Admin Panel calls GetProjectIds() or uses this type, in Blazor or here. Check
// whether the page still needs a project picker before building one.
export interface CostCodeRecord {
  recNum: number;
  jobNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  // C# also has two calculated properties that aren't in the API: RecNumber (RecNum as text) and
  // RecJobNumber (`${RecNum} - ${JobNumber}`). Work them out in the template if this is ever used.
}
