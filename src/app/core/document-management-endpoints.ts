// Endpoint constants for the Document Management module (FileManagerComponent.razor +
// DocManagementComponent.razor / RootFileManagerComponent.razor).
//
// This is a NEW, module-scoped file - deliberately does NOT edit or extend the shared
// core/global-endpoints.ts, per this project's per-module endpoints-file convention (see
// bids-endpoints.ts / accounting-endpoints.ts's header comments for precedent).
//
// IMPORTANT CONFIDENCE NOTE: unlike most other modules, NONE of these routes are centralized in
// Common/GlobalEndpoints.cs, and no DocumentManagement/RootDocumentManagement controller exists
// anywhere in the staged source (Controllers/ only contains AuthenticationController.cs) - the
// BidsDocumentManagement controller backing the Bids module's file manager has the same gap
// (see bids-endpoints.ts's "File manager" comment). Every URL below is read verbatim from the
// two real components' <FileManagerAjaxSettings>/OnFileOpenHandler code (CONFIRMED as literal
// strings in the .razor source), but the actual request/response contract behind them is
// UNCONFIRMED - there's no handler implementation to check field names, verbs, or auth against.
export const DocumentManagementEndpoints = {
  // --- Project-scoped file manager ---
  // FileManagerComponent.razor, routed from DocManagementComponent.razor
  // (@page "/DocManagement/Project/{ProjectId:int}"). CONFIRMED literal URLs.
  ProjectFileOperationsUrl: 'api/DocumentManagement/FileOperations',
  ProjectFileUploadUrl: 'api/DocumentManagement/FileUpload',
  ProjectFileDownloadUrl: 'api/DocumentManagement/FileDownload',
  ProjectFileGetImageUrl: 'api/DocumentManagement/FileGetImage',

  // --- Root/global file manager ---
  // RootFileManagerComponent.razor (@page "/DocManagement/Main") - browses one single
  // configured root share (Config["FileSettings:FolderName"]), not scoped to a project.
  // CONFIRMED literal URLs.
  RootFileOperationsUrl: 'api/RootDocumentManagement/FileOperations',
  RootFileUploadUrl: 'api/RootDocumentManagement/FileUpload',
  RootFileDownloadUrl: 'api/RootDocumentManagement/FileDownload',
  RootFileGetImageUrl: 'api/RootDocumentManagement/FileGetImage',

  // --- File open/view (both scopes) ---
  // NOTABLE QUIRK, reproduced as-observed rather than "fixed": BOTH FileManagerComponent.razor's
  // AND RootFileManagerComponent.razor's OnFileOpenHandler build their "open PDF" URL against
  // `api/DocumentManagement/GetFile` - even the Root/global component never switches this one
  // to `api/RootDocumentManagement/GetFile` the way its FileOperations/Upload/Download/GetImage
  // URLs correctly do. This looks like copy-paste from the project-scoped component that was
  // never updated. Reproduced exactly (one shared GetFileUrl below, used regardless of scope) -
  // confirm with the backend team whether Root document opens are actually broken in production
  // or whether the real controller quietly handles both paths the same way.
  GetFileUrl: 'api/DocumentManagement/GetFile',

  // INFERRED, not confirmed as a real working route: RootFileManagerComponent.razor's docx/xlsx
  // branch calls this via a custom `openFileTab` JS interop function (not `window.open`), whose
  // implementation wasn't in the staged source, so its actual behavior (redirect? render HTML?)
  // is unknown. NOT wired up by this Angular port - see document-management.service.ts's viewer
  // decision note; kept here only so the URL string isn't lost if a real preview endpoint is
  // built later.
  PreviewFileUrl: 'api/DocumentManagement/PreviewFile',

  // --- Cross-module bridge ---
  // Resolves a project's folder name from :projectId, mirroring
  // FileManagerComponentBase.razor.cs's call to IProjectOverviewService.GetJobCodeDetails.
  // CONFIRMED via Common/GlobalEndpoints.cs (GetJobCodeDetails = "api/ProjectOverview/GetJobDetails").
  // Duplicated here as a literal rather than importing core/project-management-endpoints.ts
  // directly, same reasoning Bids/Accounting used for their cross-module endpoint duplication
  // (see bids-endpoints.ts's GetAllContractorClientsUrl comment) - avoids a hard dependency on
  // a sibling module's file this phase was told not to edit.
  GetJobCodeDetailsUrl: 'api/ProjectOverview/GetJobDetails',
} as const;
