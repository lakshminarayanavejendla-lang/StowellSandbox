// API routes for Document Management (FileManagerComponent, DocManagementComponent and
// RootFileManagerComponent in the Blazor app). Each module keeps its own endpoints file.
//
// None of these are in GlobalEndpoints.cs, and we don't have the DocumentManagement or
// RootDocumentManagement controllers (the Bids file manager has the same gap). The URLs are copied
// exactly from the Blazor components, but the request and response shapes behind them are unconfirmed.
export const DocumentManagementEndpoints = {
  // --- Project-scoped file manager ---
  // From FileManagerComponent.razor (opened from /DocManagement/Project/{ProjectId}).
  ProjectFileOperationsUrl: 'api/DocumentManagement/FileOperations',
  ProjectFileUploadUrl: 'api/DocumentManagement/FileUpload',
  ProjectFileDownloadUrl: 'api/DocumentManagement/FileDownload',
  ProjectFileGetImageUrl: 'api/DocumentManagement/FileGetImage',

  // --- Root/global file manager ---
  // From RootFileManagerComponent.razor (/DocManagement/Main). Browses the one share set in
  // FileSettings:FolderName, not a project folder.
  RootFileOperationsUrl: 'api/RootDocumentManagement/FileOperations',
  RootFileUploadUrl: 'api/RootDocumentManagement/FileUpload',
  RootFileDownloadUrl: 'api/RootDocumentManagement/FileDownload',
  RootFileGetImageUrl: 'api/RootDocumentManagement/FileGetImage',

  // --- File open/view (both scopes) ---
  // Both Blazor components open PDFs through api/DocumentManagement/GetFile, including the root one,
  // which uses RootDocumentManagement for everything else. It looks like a copy-paste slip, but we
  // kept it as is. Ask the backend team whether opening root documents works in production.
  GetFileUrl: 'api/DocumentManagement/GetFile',

  // Not used. The Blazor root file manager opened docx/xlsx files through this with a JavaScript helper
  // we don't have, so we don't know what it returns. Kept in case a preview endpoint is built.
  PreviewFileUrl: 'api/DocumentManagement/PreviewFile',

  // --- Cross-module bridge ---
  // Looks up a project's folder name, as FileManagerComponentBase did (GlobalEndpoints.GetJobCodeDetails).
  // Copied here so this module doesn't import project-management-endpoints.ts.
  GetJobCodeDetailsUrl: 'api/ProjectOverview/GetJobDetails',
} as const;
