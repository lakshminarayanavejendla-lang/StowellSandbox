-- 2026-10-04 - SAGESBQ index review. Run once; safe to re-run (each index is created only if it is missing).
--
-- Why these and not others: the tables below only have their primary key (most of the app's own tables), but the app and its
-- procedures look rows up by job, phase, status, allocation or draft - for example sp_ApproveBudgetTransaction runs
-- "WHERE JobID = @JobID AND PhaseNumber = @phsnum AND ISApproved = 0", PO_UpdatePo / CO_UpdateCo delete and re-insert BackCharges by
-- PONum / CONum, and the allocation, draft and bid screens load child rows by AllocationId / DraftID / JobID. At today's size
-- (a few hundred rows) this changes little; it keeps those lookups fast as the tables grow, notably BudgetTransactionLog,
-- which gets a row for every budget action. Tables that already have an index on the column they are searched by are left alone
-- (ApiCallLog, the approval request tables' Status indexes, the Bids / ProjectInfo / ProjectLocation / ContractorInfo JobID keys).
--
-- Nothing is dropped or changed; indexes are only added. Needs QUOTED_IDENTIFIER ON (run with sqlcmd -I, or from SSMS).
USE SageSBQ;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Budget approval flow (New / Modify Budget)
IF COL_LENGTH('dbo.BudgetTransactions', 'JobID') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BudgetTransactions_Job_Phase_Approved' AND object_id = OBJECT_ID('dbo.BudgetTransactions'))
    CREATE INDEX IX_BudgetTransactions_Job_Phase_Approved ON dbo.BudgetTransactions (JobID, PhaseNumber, ISApproved);
IF COL_LENGTH('dbo.BudgetTransactionDrafts', 'JobID') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BudgetTransactionDrafts_Job_Phase' AND object_id = OBJECT_ID('dbo.BudgetTransactionDrafts'))
    CREATE INDEX IX_BudgetTransactionDrafts_Job_Phase ON dbo.BudgetTransactionDrafts (JobID, PhaseNumber);
IF COL_LENGTH('dbo.SageBudgetTransactions', 'JobID') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SageBudgetTransactions_Job_Phase' AND object_id = OBJECT_ID('dbo.SageBudgetTransactions'))
    CREATE INDEX IX_SageBudgetTransactions_Job_Phase ON dbo.SageBudgetTransactions (JobID, PhaseNumber);
IF COL_LENGTH('dbo.SageBudgetTransactionDrafts', 'JobID') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SageBudgetTransactionDrafts_Job_Phase' AND object_id = OBJECT_ID('dbo.SageBudgetTransactionDrafts'))
    CREATE INDEX IX_SageBudgetTransactionDrafts_Job_Phase ON dbo.SageBudgetTransactionDrafts (JobID, PhaseNumber);
IF COL_LENGTH('dbo.BudgetTransactionLog', 'JobID') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BudgetTransactionLog_Job_LogDate' AND object_id = OBJECT_ID('dbo.BudgetTransactionLog'))
    CREATE INDEX IX_BudgetTransactionLog_Job_LogDate ON dbo.BudgetTransactionLog (JobID, LogDate);
GO

-- CO budget allocations
IF COL_LENGTH('dbo.CoBudgetAllocations', 'Status') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CoBudgetAllocations_Status_Job' AND object_id = OBJECT_ID('dbo.CoBudgetAllocations'))
    CREATE INDEX IX_CoBudgetAllocations_Status_Job ON dbo.CoBudgetAllocations (Status, JobId);
IF COL_LENGTH('dbo.CoBudgetAllocationLines', 'AllocationId') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CoBudgetAllocationLines_Allocation' AND object_id = OBJECT_ID('dbo.CoBudgetAllocationLines'))
    CREATE INDEX IX_CoBudgetAllocationLines_Allocation ON dbo.CoBudgetAllocationLines (AllocationId);
IF COL_LENGTH('dbo.CoBudgetAllocationPhases', 'AllocationId') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CoBudgetAllocationPhases_Allocation' AND object_id = OBJECT_ID('dbo.CoBudgetAllocationPhases'))
    CREATE INDEX IX_CoBudgetAllocationPhases_Allocation ON dbo.CoBudgetAllocationPhases (AllocationId);
GO

-- PO / CO drafts and back charges (PO_UpdatePo / CO_UpdateCo replace back charges by PO / CO number)
IF COL_LENGTH('dbo.PoRequestDraftItems', 'DraftID') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PoRequestDraftItems_Draft' AND object_id = OBJECT_ID('dbo.PoRequestDraftItems'))
    CREATE INDEX IX_PoRequestDraftItems_Draft ON dbo.PoRequestDraftItems (DraftID);
IF COL_LENGTH('dbo.CoRequestDraftItems', 'DraftID') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CoRequestDraftItems_Draft' AND object_id = OBJECT_ID('dbo.CoRequestDraftItems'))
    CREATE INDEX IX_CoRequestDraftItems_Draft ON dbo.CoRequestDraftItems (DraftID);
IF COL_LENGTH('dbo.PoRequestDrafts', 'CreatedBy') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PoRequestDrafts_CreatedBy_Status' AND object_id = OBJECT_ID('dbo.PoRequestDrafts'))
    CREATE INDEX IX_PoRequestDrafts_CreatedBy_Status ON dbo.PoRequestDrafts (CreatedBy, Status);
IF COL_LENGTH('dbo.CoRequestDrafts', 'CreatedBy') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CoRequestDrafts_CreatedBy_Status' AND object_id = OBJECT_ID('dbo.CoRequestDrafts'))
    CREATE INDEX IX_CoRequestDrafts_CreatedBy_Status ON dbo.CoRequestDrafts (CreatedBy, Status);
IF COL_LENGTH('dbo.BackCharges', 'PONum') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BackCharges_PONum' AND object_id = OBJECT_ID('dbo.BackCharges'))
    CREATE INDEX IX_BackCharges_PONum ON dbo.BackCharges (PONum);
IF COL_LENGTH('dbo.BackCharges', 'CONum') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BackCharges_CONum' AND object_id = OBJECT_ID('dbo.BackCharges'))
    CREATE INDEX IX_BackCharges_CONum ON dbo.BackCharges (CONum);
GO

-- Bid / project edit screens (load amounts, employees and phases by job) and the bid -> project link
IF COL_LENGTH('dbo.BidAmount', 'JobID') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BidAmount_JobID' AND object_id = OBJECT_ID('dbo.BidAmount'))
    CREATE INDEX IX_BidAmount_JobID ON dbo.BidAmount (JobID);
IF COL_LENGTH('dbo.BidEmployee', 'JobID') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BidEmployee_JobID' AND object_id = OBJECT_ID('dbo.BidEmployee'))
    CREATE INDEX IX_BidEmployee_JobID ON dbo.BidEmployee (JobID);
IF COL_LENGTH('dbo.BidPhase', 'JobID') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BidPhase_JobID' AND object_id = OBJECT_ID('dbo.BidPhase'))
    CREATE INDEX IX_BidPhase_JobID ON dbo.BidPhase (JobID);
IF COL_LENGTH('dbo.BidRecords', 'ProjectRecNum') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BidRecords_ProjectRecNum' AND object_id = OBJECT_ID('dbo.BidRecords'))
    CREATE INDEX IX_BidRecords_ProjectRecNum ON dbo.BidRecords (ProjectRecNum);
GO
