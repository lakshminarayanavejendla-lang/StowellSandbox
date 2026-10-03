// Small response types matching SimpleResponse, NextDisplayBidIDResponse and ConvertBidResponse
// (DTO/BidInfoDto.cs).
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
  // The C# property is NewProjectID, so the JSON has "newProjectID" with a capital ID. This used to
  // read "newProjectId", which was always undefined, so Bid Won showed "Unable to create bid" even
  // when it worked (2026-09-16).
  newProjectID: string;
}
