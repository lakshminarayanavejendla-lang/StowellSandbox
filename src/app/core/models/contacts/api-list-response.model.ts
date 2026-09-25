// Port of StowellCoApp.DTO.ApiListResponse<T> (DTO/ApiListResponse.cs) - CONFIRMED shape, but same
// orphan flag as the other two models in this folder: not referenced by ContactService.cs or
// Contacts/Index.razor + IndexBase.razor.cs (which call GetAllGroups/GetGroupUsers and get back
// bare arrays, not this wrapper). Kept as a generic model port only, unused by this module's real
// service calls today.
export interface ApiListResponse<T> {
  data: T[];
}
