// API routes for the Contacts module (company directory and security group lookups).
//
// Kept separate from global-endpoints.ts. GlobalEndpoints.cs has nothing for contacts, so these are
// copied exactly from the plain strings in ContactService.cs.
export const ContactsEndpoints = {
  GetAllGroupsUrl: 'api/SecurityGroup/GetAllGroups',
  GetGroupUsersUrl: 'api/SecurityGroup/GetGroupUsers',
  // Added to SecurityGroupController.cs (not in the Blazor app). Looks up specific users by email
  // through Graph. Going through all ~280 groups one by one made the directory far too slow, and
  // the page only needed a few people (leadership).
  GetUsersByEmailUrl: 'api/SecurityGroup/GetUsersByEmail',
  // Also added to SecurityGroupController.cs. Lists every enabled member user from Graph /users,
  // page by page, without going through groups. About 14 users here, around 13 seconds with photos,
  // which is fine for the full directory.
  GetAllUsersUrl: 'api/SecurityGroup/GetAllUsers',
  // A small profile photo for one user (image/jpeg; 404 when there is none).
  UserPhotoUrl: 'api/SecurityGroup/UserPhoto',
} as const;
