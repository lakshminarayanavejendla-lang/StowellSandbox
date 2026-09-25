// Mirrors StowellCoApp.DTO.FileDirectoryContent / FileDetails / ErrorDetails
// (DTO/FileOperationDto.cs - confirmed, same DTO already used by the Bids module's file
// manager, see core/models/bids/bid-file.model.ts). The Blazor DocumentManagement pages wired
// Syncfusion's paid SfFileManager (see HANDOFF.md's "free component library" decision) straight
// to api/DocumentManagement/* and api/RootDocumentManagement/* via FileManagerAjaxSettings; no
// DocumentManagement controller exists in the staged source (Controllers/ only contains
// AuthenticationController.cs), so the exact request/response contract is inferred from those
// Ajax URLs + this DTO's shape, not confirmed against real handler code.
//
// Unlike Bids' flat per-bid file list, both DocumentManagement components pass FileDirectoryContent
// (which includes HasChild/Path) and render Syncfusion's tree-capable file manager, so this port
// supports folder navigation (see file-browser.component.ts) rather than a single flat table.
export interface DocumentFileEntry {
  id?: string;
  name: string;
  /** Virtual path to the file/folder within its scope's root - confirmed field on FileDirectoryContent. */
  path?: string;
  /** Bytes; 0 for folders. */
  size: number;
  isFile: boolean;
  /** File extension (e.g. ".pdf"), confirmed field name "Type" on FileDirectoryContent. */
  type?: string;
  hasChild?: boolean;
  dateCreated?: string;
  dateModified?: string;
  /** Physical filter path (root folder path) - confirmed field, required by the GetFile route below. */
  filterPath?: string;
}

export interface DocumentFileError {
  message: string;
  code?: string;
}

// Which of the two Blazor file-manager pages a request targets - see
// document-management-endpoints.ts for the URL prefixes each maps to.
//  - 'project': FileManagerComponent.razor (@page via DocManagementComponent.razor
//    "/DocManagement/Project/{ProjectId}") - one project/job's document folder.
//  - 'root': RootFileManagerComponent.razor (@page "/DocManagement/Main") - a single
//    configured root share, browsing across everything rather than one project.
export type DocumentManagementScope = 'project' | 'root';

// Mirrors StowellCoApp.DTO.Job (Services/IProjectOverviewService.cs's GetJobCodeDetails) just
// enough to resolve the folder name FileManagerComponentBase.razor.cs needs
// (Config["...RootSharePath"] + jobcodedetails.FullJob, same pattern as Bids'
// BidFileManagerComponentBase). Deliberately NOT re-declared from scratch - reuses the shape
// already confirmed in core/models/project-management/cost-summary.model.ts's `Job` interface
// (fullJob/jobName/recnum) rather than keeping a second, possibly-drifting copy alive, same
// reconciliation approach HANDOFF.md documents for BidInfoDto between Project Management and
// Estimation.
export interface ProjectFolderDetails {
  recnum: string;
  jobName: string;
  fullJob: string;
}
