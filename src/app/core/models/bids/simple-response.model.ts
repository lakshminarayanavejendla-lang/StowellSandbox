// Small shared response shapes mirroring StowellCoApp.DTO.SimpleResponse,
// NextDisplayBidIDResponse, and ConvertBidResponse (DTO/BidInfoDto.cs).
export interface SimpleResponse {
    Message?: string;
  message?: string;
}

export interface NextDisplayBidIdResponse {
  success: boolean;
   displayBidID: string | null;
}

export interface ConvertBidResponse {
  message: string;
  // FIX (2026-09-16) - was "newProjectId" (lowercase d). The API's C# property is
  // NewProjectID, and ASP.NET Core's default camelCase JSON policy only lowercases the
  // first letter, giving "newProjectID" (capital ID) on the wire - a case-sensitive
  // property lookup on "newProjectId" always came back undefined, so Bid Won always fell
  // into the "Unable to create bid" branch client-side even though the backend succeeded.
  newProjectID: string;
}
