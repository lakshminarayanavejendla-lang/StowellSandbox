// Reconciled after Phase 2: this file used to hold an INFERRED reconstruction of BidInfoDto
// (built from how OverviewTab/ProjectDetailsTab use it, without access to the real DTO). The
// Estimation-phase agent read DTO/BidInfoDto.cs directly and produced a confirmed version at
// core/models/estimation/bid-info.model.ts (+ bid-line-items.model.ts / estimation-common.model.ts
// / contractor-client.model.ts for BidPhase/EmployeeDetails/ContractorClient). Every field the
// Project Overview tabs actually bind to (jobID, jobName, division, bidStatus, contractNumber/
// Date/Amount, estStartDate/estCompletionDate, projectLocation.*, contractorInfo.*, projectInfo.*)
// is present in the confirmed shape, so this file now just re-exports it instead of keeping a
// second, divergent, unconfirmed copy alive. No changes were needed in the two tab components or
// project-overview.service.ts - they already imported these four names from this path.
export type {
  BidInfoDto,
  ProjectLocationDto as ProjectLocationInfo,
  ContractorInfoDto as ContractorInfo,
  ProjectInfoDto as ProjectInfo,
} from '../estimation/bid-info.model';
export type { BidPhase } from '../estimation/bid-line-items.model';
export type { EmployeeDetails } from '../estimation/estimation-common.model';
export type { ContractorClient } from '../estimation/contractor-client.model';
