// API routes for Bids (Current Bids, Bid Queue, Bid Overview, New Bid, bid documents).
//
// Most of these come straight from GlobalEndpoints.cs, under the same groupings. They're copied
// here so each module has its own file. Keep the two in sync.
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

  // The only Bids route that isn't in GlobalEndpoints.cs; BidService.cs uses it as a plain string.
  GetContractorClientByNameUrl: 'api/Bids/GetContractorClientByName',

  // An Estimation route, used by the Client (general contractor) dropdown on the bid details tab.
  GetAllContractorClientsUrl: 'api/Estimation/GetAllContractorClients',

  // Bid documents (api/BidsDocumentManagement/*). Taken from the Blazor file manager's URLs; we don't
  // have the controller. bid-file.service.ts calls them in a simple REST style that only approximates
  // Syncfusion's protocol, so adjust it once the controller is known.
  BidFileOperationsUrl: 'api/BidsDocumentManagement/FileOperations',
  BidFileUploadUrl: 'api/BidsDocumentManagement/FileUpload',
  BidFileDownloadUrl: 'api/BidsDocumentManagement/FileDownload',
  BidFileGetUrl: 'api/BidsDocumentManagement/GetFile',

  // Bid notes. New, so these names are guesses that follow the Bid Amounts pattern. Until the server
  // has them, the notes list loads empty and Add reports a failure.
  GetBidNotesUrl: 'api/Bids/GetBidNotes',
  AddBidNoteUrl: 'api/Bids/AddBidNote',
} as const;
