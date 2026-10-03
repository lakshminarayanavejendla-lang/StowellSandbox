// Matches ContactGroups and ContactGroupMembers in DTO/ContactGroups.cs. The Contacts page is a
// company directory with a tab per security group, each showing its members' contact cards.

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
  // Optional (`string? photoBase64` in C#). A base64 JPEG shown as data:image/jpeg;base64,...,
  // with a placeholder avatar when it's missing.
  photoBase64?: string | null;
}
