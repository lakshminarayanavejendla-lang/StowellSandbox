// Endpoint constants for the Contacts module (company directory / SecurityGroup lookups).
//
// This is a NEW, module-scoped file - it deliberately does NOT edit or extend the shared
// core/global-endpoints.ts (owned by Phase 1 / used across modules) to avoid colliding with the
// parallel Document Management/Reporting Dashboard/Phoenix Admin agents.
//
// Confirmed by direct read of Services/ContactService.cs - Common/GlobalEndpoints.cs has no
// Contacts-specific entries at all (grepped, zero matches for "Contact"/"SecurityGroup"), so
// ContactService.cs builds both routes as inline string literals rather than going through the
// shared constants class - same "some routes centralized, most not" pattern flagged in every
// other module's endpoints file so far. Reproduced here verbatim.
export const ContactsEndpoints = {
  GetAllGroupsUrl: 'api/SecurityGroup/GetAllGroups',
  GetGroupUsersUrl: 'api/SecurityGroup/GetGroupUsers',
  // New endpoint added to SecurityGroupController.cs (not present in the original Blazor
  // source) - fetches specific users by email/UPN directly via Graph, bypassing the
  // GetAllGroups + per-group GetGroupUsers fan-out entirely. Added because this tenant has
  // ~280 groups and the full fan-out (2 sequential Graph calls per member, no parallelism
  // within a group) made the directory page impractically slow; the business need was to
  // show a small, specific set of people (leadership), not the whole tenant.
  GetUsersByEmailUrl: 'api/SecurityGroup/GetUsersByEmail',
  // Also added to SecurityGroupController.cs - lists every enabled member-type user in the
  // tenant directly via Graph /users (paginated), skipping group enumeration entirely. ~14
  // users in this tenant, ~13s round trip including per-user photo fetches - fine for a full
  // directory view, unlike the ~280-group fan-out this replaces.
  GetAllUsersUrl: 'api/SecurityGroup/GetAllUsers',
} as const;
