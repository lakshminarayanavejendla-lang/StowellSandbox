// Endpoint constants for the Bids/Opportunities module (CurrentBids/BidQueue/BidOverview/
// NewBid/BidFileManagerComponent).
//
// This is a NEW, module-scoped file - it deliberately does NOT edit or extend the shared
// core/global-endpoints.ts (owned by Phase 1 / used across modules) to avoid colliding with the
// parallel Project Management/Estimation/Accounting agents. Most of these DO already exist in
// the real Common/GlobalEndpoints.cs under a "// Bid Details" / "// Bid Amounts" / "// Bid
// Access" / "// create new bid" grouping - reproduced here verbatim so this module doesn't
// have to import a file it was told not to touch. Keep both in sync if either changes.
export const BidsEndpoints = {
  // Bid Details
  GetCurrentBidsUrl: 'api/Bids/GetCurrentBids',
  GetBidQueueDataUrl: 'api/Bids/GetBidQueueData',
  GetBidByIdUrl: 'api/Bids/GetBidById',
  UpdateBidDetailsUrl: 'api/Bids/UpdateBidDetails',
  ConvertBidToProjectUrl: 'api/Bids/ConvertBidToProject',
  CloseBidAsLostUrl: 'api/Bids/CloseBidAsLost',

  // Bid Amounts
  GetBidAmountsUrl: 'api/Bids/GetBidAmounts',
  AddBidAmountUrl: 'api/Bids/AddBidAmount',
  UpdateBidAmountUrl: 'api/Bids/UpdateBidAmount',
  DeleteBidAmountUrl: 'api/Bids/DeleteBidAmount',

  // Bid Access
  GetBidAccessSummaryUrl: 'api/Bids/GetBidAccessSummary',
  AddBidAccessUrl: 'api/Bids/AddBidAccess',
  RemoveBidAccessUrl: 'api/Bids/RemoveBidAccess',

  // Create new bid
  GetNextDisplayBidIDUrl: 'api/Bids/GetNextDisplayBidID',
  CreateNewBidUrl: 'api/Bids/CreateNewBid',
  GetBidAccessEmployeesUrl: 'api/Bids/GetBidAccessEmployees',
  GetAllBidPhasesUrl: 'api/Bids/GetAllBidPhases',
  GetAllBidStatusUrl: 'api/Bids/GetAllBidStatus',

  // NOT in Common/GlobalEndpoints.cs - BidService.cs's GetContractorClientByName builds this
  // route as an inline string literal ("api/Bids/GetContractorClientByName") instead of going
  // through the shared constants class, unlike every other Bids route. Reproduced here
  // verbatim; flagging the inconsistency rather than silently "fixing" it with a different name.
  GetContractorClientByNameUrl: 'api/Bids/GetContractorClientByName',

  // Cross-module: this route actually lives on IEstimationService/EstimationService.cs, used by
  // BidProjectDetailsTab.razor's "Client" (General Contractor) dropdown. Duplicated here for the
  // same reason the Estimation module duplicates a couple of GlobalEndpoints entries - see
  // contractor-client.model.ts's header comment.
  GetAllContractorClientsUrl: 'api/Estimation/GetAllContractorClients',

  // File manager (BidFileManagerComponent -> api/BidsDocumentManagement/*). Inferred from the
  // Blazor FileManagerAjaxSettings URLs (Url/UploadUrl/DownloadUrl/GetImageUrl) plus the
  // OnFileOpenHandler's GetFile URL; NOT confirmed against an actual controller (one wasn't
  // part of the staged source). The Angular bid-file.service.ts's contract built on top of
  // these is a plain-REST approximation of Syncfusion's action-based AJAX protocol - confirm
  // and reshape once the real controller behavior is known.
  BidFileOperationsUrl: 'api/BidsDocumentManagement/FileOperations',
  BidFileUploadUrl: 'api/BidsDocumentManagement/FileUpload',
  BidFileDownloadUrl: 'api/BidsDocumentManagement/FileDownload',
  BidFileGetUrl: 'api/BidsDocumentManagement/GetFile',

  // Bid Notes - NEW, not in Blazor source (grep of the staged Blazor source found no Notes
  // feature for Bids at all). Route names below follow this file's Bid Amounts naming
  // convention as a best guess - CONFIRM against the backend before relying on them; until then
  // bid-note.service.ts's getBidNotes/addBidNote resolve to [] / {newId:0} via the same
  // catchError pattern used everywhere else in this app, so the Notes table loads empty and Add
  // reports failure rather than silently no-opping.
  GetBidNotesUrl: 'api/Bids/GetBidNotes',
  AddBidNoteUrl: 'api/Bids/AddBidNote',
} as const;
