// Mirrors StowellCoApp.DTO.FileDirectoryContent / FileDetails / ErrorDetails
// (DTO/FileOperationDto.cs). The Blazor original wired Syncfusion's paid SfFileManager (see
// HANDOFF.md's "free component library" decision) to api/BidsDocumentManagement/* via
// FileManagerAjaxSettings; this Angular port replaces it with a plain upload/list/delete table
// against an inferred REST-ish contract (see BidsEndpoints + bid-file.service.ts) since the
// actual BidsDocumentManagement controller wasn't part of the staged source - confirm the real
// request/response shapes before wiring this up for real data.
export interface BidFileEntry {
  id?: string;
  name: string;
  path?: string;
  size: number;
  isFile: boolean;
  type?: string;
  hasChild?: boolean;
  dateCreated?: string;
  dateModified?: string;
  filterPath?: string;
}

export interface BidFileError {
  message: string;
  code?: string;
}
