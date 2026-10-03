// Matches FileDirectoryContent, FileDetails and ErrorDetails in DTO/FileOperationDto.cs, the same
// DTO the bid file manager uses (see bid-file.model.ts). We don't have the DocumentManagement
// controller, so the request and response shapes are worked out from the URLs and this DTO.
//
// The entries include HasChild and Path, so the document pages support folders
// (see file-browser.component.ts), not just a flat list like bids.
export interface DocumentFileEntry {
  id?: string;
  name: string;
  /** Path to the file or folder inside its root. */
  path?: string;
  /** Bytes; 0 for folders. */
  size: number;
  isFile: boolean;
  /** File extension, such as ".pdf" ("Type" on FileDirectoryContent). */
  type?: string;
  hasChild?: boolean;
  dateCreated?: string;
  dateModified?: string;
  /** The root folder path. The GetFile route needs it. */
  filterPath?: string;
}

export interface DocumentFileError {
  message: string;
  code?: string;
}

// Which document page a request is for (document-management-endpoints.ts has the URLs):
//  - 'project': one job's folder (/DocManagement/Project/{ProjectId} in Blazor).
//  - 'root': the shared root folder across all jobs (/DocManagement/Main in Blazor).
export type DocumentManagementScope = 'project' | 'root';

// The job fields needed to build a project's folder name (RootSharePath + FullJob, as the Blazor
// file manager did). Reuses the Job interface from cost-summary.model.ts rather than a second copy.
export interface ProjectFolderDetails {
  recnum: string;
  jobName: string;
  fullJob: string;
}
