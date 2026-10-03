// Matches FileDirectoryContent, FileDetails and ErrorDetails in DTO/FileOperationDto.cs. We don't
// have the BidsDocumentManagement controller, so the request and response shapes are guessed (see
// BidsEndpoints and bid-file.service.ts). Confirm them before using real data.
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
