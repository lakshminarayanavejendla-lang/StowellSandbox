// Re-exports the bid models from estimation/bid-info.model.ts and its related files, which match
// DTO/BidInfoDto.cs. This file used to hold a guessed copy. Every field the Project Overview tabs
// use is in the real one, and the tabs and project-overview.service.ts still import from this path.
export type {
  BidInfoDto,
  ProjectLocationDto as ProjectLocationInfo,
  ContractorInfoDto as ContractorInfo,
  ProjectInfoDto as ProjectInfo,
} from '../estimation/bid-info.model';
export type { BidPhase } from '../estimation/bid-line-items.model';
export type { EmployeeDetails } from '../estimation/estimation-common.model';
export type { ContractorClient } from '../estimation/contractor-client.model';
