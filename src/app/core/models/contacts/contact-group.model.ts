// Port of StowellCoApp.DTO.ContactGroups / ContactGroupMembers (DTO/ContactGroups.cs) - CONFIRMED,
// read directly from source. These are the two shapes actually consumed by Contacts/Index.razor +
// IndexBase.razor.cs (a security-group-scoped company directory: tabs of groups, each tab lists
// that group's member contact cards).

export interface ContactGroup {
  id: string;
  displayName: string;
}

export interface ContactGroupMember {
  id: string;
  displayName: string;
  jobTitle: string;
  city: string;
  mail: string;
  streetAddress: string;
  state: string;
  postalCode: string;
  location: string;
  company: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  // Nullable in the C# source (`string? photoBase64`) - a raw base64 JPEG string rendered via
  // `data:image/jpeg;base64,...`, falls back to a static dummy-avatar image when absent.
  photoBase64?: string | null;
}
