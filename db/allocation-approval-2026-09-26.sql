-- 2026-09-26 - Mike Smith: budget allocations (Prime and Internal) need Accounting approval (same rules as POs and change orders).
--   Submit  -> the allocation is held in dbo.CoAllocationApprovalRequests (status Pending). Nothing is posted to Sage and no CO is created.
--   Approve -> CO_SubmitBudgetReallocation runs with the stored values, exactly as a submit always did (saves the allocation, posts the
--              debit/credit lines to the Sage budget, creates the Sage CO), and the request is marked Approved.
--   Reject  -> the request is marked Rejected (with the reason) and drops out of the queue; nothing is posted.
--
-- One new table and five procedures. CO_SubmitBudgetReallocation itself is NOT changed. Run against the SageSBQ database.

USE SageSBQ;
GO

IF OBJECT_ID('dbo.CoAllocationApprovalRequests') IS NULL
BEGIN
    CREATE TABLE dbo.CoAllocationApprovalRequests (
        RequestId         int IDENTITY(1,1) NOT NULL CONSTRAINT PK_CoAllocationApprovalRequests PRIMARY KEY,
        CoType            varchar(20)    NOT NULL,           -- Prime / Internal
        CoNumber          varchar(20)    NULL,               -- as typed/previewed at submit; the real number is assigned on approval
        JobId             varchar(20)    NOT NULL,
        JobName           varchar(200)   NULL,
        CoDescription     varchar(100)   NULL,
        CoReason          varchar(200)   NULL,
        CoStatus          varchar(50)    NULL,
        OverallBudget     decimal(19, 2) NOT NULL CONSTRAINT DF_CoAllocReq_Overall DEFAULT 0,
        ProfitOnSell      decimal(19, 2) NOT NULL CONSTRAINT DF_CoAllocReq_Profit DEFAULT 0,
        RequestedAmount   decimal(19, 2) NULL,
        ApprovedAmount    decimal(19, 2) NULL,
        BudgetChangeTotal decimal(19, 2) NOT NULL CONSTRAINT DF_CoAllocReq_Change DEFAULT 0,
        CreatedBy         varchar(100)   NULL,
        PhasesJson        nvarchar(max)  NOT NULL,
        LinesJson         nvarchar(max)  NOT NULL,
        SubmittedDate     datetime       NOT NULL CONSTRAINT DF_CoAllocReq_Submitted DEFAULT GETDATE(),
        Status            varchar(20)    NOT NULL CONSTRAINT DF_CoAllocReq_Status DEFAULT 'Pending'
                          CONSTRAINT CK_CoAllocReq_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
        DecidedBy         varchar(100)   NULL,
        DecidedDate       datetime       NULL,
        RejectReason      varchar(500)   NULL,
        ResultCoNumber    varchar(20)    NULL,               -- the CO number Sage received, set on approval
        AllocationId      int            NULL                -- dbo.CoBudgetAllocations.AllocationId, set on approval
    );
    CREATE INDEX IX_CoAllocationApprovalRequests_Status ON dbo.CoAllocationApprovalRequests (Status, SubmittedDate);
END
GO

-- CO_SubmitAllocationForApproval - same parameters as CO_SubmitBudgetReallocation; holds the allocation
CREATE OR ALTER PROCEDURE dbo.CO_SubmitAllocationForApproval
    @CoNumber varchar(20) = NULL,
    @JobId varchar(20),
    @JobName varchar(200),
    @CoType varchar(20),
    @CoDescription varchar(100),
    @CoReason varchar(200),
    @CoStatus varchar(50),
    @OverallBudget decimal(19, 2),
    @ProfitOnSell decimal(19, 2) = 0,
    @RequestedAmount decimal(19, 2) = NULL,
    @ApprovedAmount decimal(19, 2) = NULL,
    @CreatedBy varchar(100),
    @PhasesJson nvarchar(max),
    @LinesJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;

    IF @CoType = 'Prime' AND (@RequestedAmount IS NULL OR @ApprovedAmount IS NULL)
    BEGIN
        RAISERROR('Requested Amount and Approved Amount are both required when CO Type is Prime.', 16, 1);
        RETURN;
    END

    DECLARE @Change decimal(19, 2) =
        ISNULL((SELECT SUM(ISNULL(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.debit')), 0) - ISNULL(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.credit')), 0))
                FROM OPENJSON(@LinesJson)), 0);

    INSERT INTO dbo.CoAllocationApprovalRequests
        (CoType, CoNumber, JobId, JobName, CoDescription, CoReason, CoStatus, OverallBudget, ProfitOnSell, RequestedAmount, ApprovedAmount,
         BudgetChangeTotal, CreatedBy, PhasesJson, LinesJson)
    VALUES
        (@CoType, NULLIF(LTRIM(RTRIM(@CoNumber)), ''), @JobId, @JobName, @CoDescription, @CoReason, @CoStatus, ISNULL(@OverallBudget, 0), ISNULL(@ProfitOnSell, 0),
         @RequestedAmount, @ApprovedAmount, @Change, @CreatedBy, @PhasesJson, @LinesJson);

    SELECT CAST(SCOPE_IDENTITY() AS int) AS RequestId;
END
GO

-- CO_GetPendingAllocationApprovals - the Accounting queue
CREATE OR ALTER PROCEDURE dbo.CO_GetPendingAllocationApprovals
AS
BEGIN
    SET NOCOUNT ON;
    SELECT RequestId, CoType, JobId, JobName, CoDescription, CoReason, CreatedBy, BudgetChangeTotal, SubmittedDate
    FROM dbo.CoAllocationApprovalRequests
    WHERE Status = 'Pending'
    ORDER BY SubmittedDate, RequestId;
END
GO

-- CO_GetAllocationApprovalRequest - one request for the approval screen; same three result sets as CO_GetBudgetReallocationById
-- (header, phases, lines) so the allocation page can show it unchanged (AllocationId here is the request id).
CREATE OR ALTER PROCEDURE dbo.CO_GetAllocationApprovalRequest
    @RequestId int
AS
BEGIN
    SET NOCOUNT ON;

    SELECT RequestId AS AllocationId, ISNULL(CoNumber, '') AS CoNumber, JobId, JobName, CoType, CoDescription, CoReason, CoStatus, OverallBudget,
           BudgetChangeTotal, ProfitOnSell, RequestedAmount, ApprovedAmount, Status, CreatedBy, SubmittedDate AS CreatedDate
    FROM dbo.CoAllocationApprovalRequests
    WHERE RequestId = @RequestId;

    SELECT JSON_VALUE(value, '$.phase') AS Phase
    FROM dbo.CoAllocationApprovalRequests r CROSS APPLY OPENJSON(r.PhasesJson)
    WHERE r.RequestId = @RequestId;

    SELECT JSON_VALUE(value, '$.costCode')                                    AS CostCode,
           JSON_VALUE(value, '$.costCodeDescription')                         AS CostCodeDescription,
           ISNULL(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.debit')), 0)  AS Debit,
           ISNULL(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.credit')), 0) AS Credit
    FROM dbo.CoAllocationApprovalRequests r CROSS APPLY OPENJSON(r.LinesJson)
    WHERE r.RequestId = @RequestId;
END
GO

-- CO_ApproveAllocationRequest - runs the real submit (CO_SubmitBudgetReallocation) and marks the request Approved.
-- All or nothing: if posting fails (e.g. a cost code would go below zero) the request stays Pending and the error is raised.
CREATE OR ALTER PROCEDURE dbo.CO_ApproveAllocationRequest
    @RequestId int,
    @ApprovedBy varchar(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @CoType varchar(20), @CoNumber varchar(20), @JobId varchar(20), @JobName varchar(200), @CoDescription varchar(100),
                @CoReason varchar(200), @CoStatus varchar(50), @Overall decimal(19, 2), @Profit decimal(19, 2), @Requested decimal(19, 2),
                @ApprovedAmt decimal(19, 2), @CreatedBy varchar(100), @Phases nvarchar(max), @Lines nvarchar(max);

        SELECT @CoType = CoType, @CoNumber = CoNumber, @JobId = JobId, @JobName = JobName, @CoDescription = CoDescription, @CoReason = CoReason,
               @CoStatus = CoStatus, @Overall = OverallBudget, @Profit = ProfitOnSell, @Requested = RequestedAmount, @ApprovedAmt = ApprovedAmount,
               @CreatedBy = CreatedBy, @Phases = PhasesJson, @Lines = LinesJson
        FROM dbo.CoAllocationApprovalRequests WITH (UPDLOCK, ROWLOCK)
        WHERE RequestId = @RequestId AND Status = 'Pending';

        IF @@ROWCOUNT = 0
        BEGIN
            RAISERROR('This allocation request was not found or has already been approved or rejected.', 16, 1);
        END

        CREATE TABLE #Result (CoNumber varchar(20), AllocationId int);
        INSERT INTO #Result (CoNumber, AllocationId)
        EXEC dbo.CO_SubmitBudgetReallocation @CoNumber = @CoNumber, @JobId = @JobId, @JobName = @JobName, @CoType = @CoType,
             @CoDescription = @CoDescription, @CoReason = @CoReason, @CoStatus = @CoStatus, @OverallBudget = @Overall, @ProfitOnSell = @Profit,
             @RequestedAmount = @Requested, @ApprovedAmount = @ApprovedAmt, @CreatedBy = @CreatedBy, @PhasesJson = @Phases, @LinesJson = @Lines;

        IF NOT EXISTS (SELECT 1 FROM #Result)
        BEGIN
            RAISERROR('The allocation could not be posted to Sage.', 16, 1);
        END

        UPDATE r
        SET Status = 'Approved', DecidedBy = @ApprovedBy, DecidedDate = GETDATE(), ResultCoNumber = x.CoNumber, AllocationId = x.AllocationId
        FROM dbo.CoAllocationApprovalRequests r CROSS JOIN #Result x
        WHERE r.RequestId = @RequestId;

        COMMIT TRANSACTION;

        SELECT CoNumber, AllocationId FROM #Result;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- CO_RejectAllocationRequest - marks the request Rejected (kept for the record) so it leaves the queue. Nothing is posted.
CREATE OR ALTER PROCEDURE dbo.CO_RejectAllocationRequest
    @RequestId int,
    @RejectedBy varchar(100),
    @Reason varchar(500)
AS
BEGIN
    SET NOCOUNT ON;

    IF LEN(LTRIM(RTRIM(ISNULL(@Reason, '')))) = 0
    BEGIN
        RAISERROR('Enter a reason for rejecting the allocation.', 16, 1);
        RETURN;
    END

    UPDATE dbo.CoAllocationApprovalRequests
    SET Status = 'Rejected', DecidedBy = @RejectedBy, DecidedDate = GETDATE(), RejectReason = LTRIM(RTRIM(@Reason))
    WHERE RequestId = @RequestId AND Status = 'Pending';

    IF @@ROWCOUNT = 0
        RAISERROR('This allocation request was not found or has already been approved or rejected.', 16, 1);
END
GO
