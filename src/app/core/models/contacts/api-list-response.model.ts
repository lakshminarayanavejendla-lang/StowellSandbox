// Matches ApiListResponse<T> in DTO/ApiListResponse.cs. Like the other models here it's unused:
// GetAllGroups and GetGroupUsers return plain arrays, not this wrapper.
export interface ApiListResponse<T> {
  data: T[];
}
