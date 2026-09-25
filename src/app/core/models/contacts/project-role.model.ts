// Port of StowellCoApp.DTO.ProjectRoles (DTO/ProjectRoles.cs) - CONFIRMED field shapes, but same
// orphan flag as access-request.model.ts: not referenced by ContactService.cs, IContactService.cs,
// or Contacts/Index.razor + IndexBase.razor.cs. No page/service in the material handed off to this
// phase consumes ProjectRoles. Kept as a plain model port only; not wired into any component or
// route here.
export interface ProjectRole {
  id: number;
  roleId: number;
  roleName?: string | null;
  description?: string | null;
  isActive?: boolean | null;
  // C# DateTime? -> ISO date string once JSON-serialized.
  createdDate?: string | null;
}
