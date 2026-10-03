-- 2026-09-26 - Mike Smith: purchase orders need Accounting approval.
--   Submit  -> the PO is held in dbo.PoApprovalRequests (status Pending) and is NOT created in Sage yet.
--   Approve -> the PO is created in Sage (exactly as PO_SubmitRequest always did) and the request is marked Approved.
--   Reject  -> the request is marked Rejected (with the reason) and drops out of the queue; nothing is created in Sage.
-- Accounting sees the Pending requests in Accounting > PO Queue (and the Accounting Queue, type "Purchase Order").
--
-- One new table and five procedures. PO_SubmitRequest itself is NOT changed - PO_ApproveRequest calls it with the stored values.
-- Run against the SageSBQ database (the procedures read Sage tables through StowellSandbox.dbo.*, like the other PO procedures).

USE SageSBQ;
GO

IF OBJECT_ID('dbo.PoApprovalRequests') IS NULL
BEGIN
    CREATE TABLE dbo.PoApprovalRequests (
        RequestId       int IDENTITY(1,1) NOT NULL CONSTRAINT PK_PoApprovalRequests PRIMARY KEY,
        JobId           bigint         NOT NULL,
        JobName         varchar(200)   NULL,
        Vendor          varchar(100)   NOT NULL,
        PoDescription   varchar(100)   NOT NULL,
        Requester       varchar(100)   NULL,
        DateRequested   date           NULL,
        RequiredOnSite  date           NULL,
        PhaseNumber     int            NOT NULL CONSTRAINT DF_PoApprovalRequests_Phase DEFAULT 0,
        TotalAmount     decimal(19, 2) NOT NULL CONSTRAINT DF_PoApprovalRequests_Total DEFAULT 0,
        ItemsJson       nvarchar(max)  NOT NULL,
        BackChargesJson nvarchar(max)  NULL,
        CreatedBy       varchar(100)   NULL,
        SubmittedDate   datetime       NOT NULL CONSTRAINT DF_PoApprovalRequests_Submitted DEFAULT GETDATE(),
        Status          varchar(20)    NOT NULL CONSTRAINT DF_PoApprovalRequests_Status DEFAULT 'Pending'
                        CONSTRAINT CK_PoApprovalRequests_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
        DecidedBy       varchar(100)   NULL,
        DecidedDate     datetime       NULL,
        RejectReason    varchar(500)   NULL,
        PoId            varchar(20)    NULL,   -- the Sage PO number, set on approval
        PoRecNum        bigint         NULL
    );
    CREATE INDEX IX_PoApprovalRequests_Status ON dbo.PoApprovalRequests (Status, SubmittedDate);
END
GO

-- ----------------------------------------------------------------------------
-- PO_SubmitForApproval - same parameters as PO_SubmitRequest; validates the same
-- things up front (so the PM gets the error at submit, not at approval) and holds the PO.
-- ----------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.PO_SubmitForApproval
    @JobId bigint,
    @Vendor varchar(100),
    @PoDescription varchar(100),
    @Requester varchar(100),
    @DateRequested date,
    @RequiredOnSite date,
    @CreatedBy varchar(100),
    @ItemsJson nvarchar(max),
    @BackChargesJson nvarchar(max),
    @PhaseNumber int = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM StowellSandbox.dbo.actpay WHERE vndnme = @Vendor)
    BEGIN
        RAISERROR('Vendor ''%s'' was not found in the Sage vendor master (actpay). PO was not submitted.', 16, 1, @Vendor);
        RETURN;
    END

    IF LEN(LTRIM(RTRIM(ISNULL(@PoDescription, '')))) = 0
    BEGIN
        RAISERROR('Enter a PO description before submitting.', 16, 1);
        RETURN;
    END

    DECLARE @Total decimal(19, 2) = ISNULL((SELECT SUM(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.itemCost'))) FROM OPENJSON(@ItemsJson)), 0);
    DECLARE @JobName varchar(200) = (SELECT TOP 1 jobnme FROM StowellSandbox.dbo.actrec WHERE recnum = @JobId);

    INSERT INTO dbo.PoApprovalRequests
        (JobId, JobName, Vendor, PoDescription, Requester, DateRequested, RequiredOnSite, PhaseNumber, TotalAmount, ItemsJson, BackChargesJson, CreatedBy)
    VALUES
        (@JobId, @JobName, @Vendor, LTRIM(RTRIM(@PoDescription)), @Requester, @DateRequested, @RequiredOnSite, ISNULL(@PhaseNumber, 0), @Total,
         @ItemsJson, @BackChargesJson, @CreatedBy);

    SELECT CAST(SCOPE_IDENTITY() AS int) AS RequestId;
END
GO

-- ----------------------------------------------------------------------------
-- PO_GetPendingApprovals - the Accounting queue
-- ----------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.PO_GetPendingApprovals
AS
BEGIN
    SET NOCOUNT ON;
    SELECT RequestId, JobId, JobName, Vendor, PoDescription, Requester, CreatedBy, PhaseNumber, TotalAmount, SubmittedDate
    FROM dbo.PoApprovalRequests
    WHERE Status = 'Pending'
    ORDER BY SubmittedDate, RequestId;
END
GO

-- ----------------------------------------------------------------------------
-- PO_GetApprovalRequest - one request for the approval screen (header, then line items)
-- ----------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.PO_GetApprovalRequest
    @RequestId int
AS
BEGIN
    SET NOCOUNT ON;

    SELECT RequestId, JobId, JobName, Vendor, PoDescription, Requester, PhaseNumber, TotalAmount, Status, RejectReason,
           CONVERT(varchar(10), DateRequested, 23)  AS DateRequested,
           CONVERT(varchar(10), RequiredOnSite, 23) AS RequiredOnSite
    FROM dbo.PoApprovalRequests
    WHERE RequestId = @RequestId;

    SELECT JSON_VALUE(value, '$.item')                                      AS Item,
           TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.remainingBudget')) AS RemainingBudget,
           TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.itemCost'))        AS ItemCost,
           JSON_VALUE(value, '$.itemNote')                                  AS ItemNote,
           TRY_CONVERT(decimal(15, 3), JSON_VALUE(value, '$.costCode'))        AS CostCode
    FROM dbo.PoApprovalRequests r CROSS APPLY OPENJSON(r.ItemsJson)
    WHERE r.RequestId = @RequestId;

    SELECT JSON_VALUE(value, '$.vendor')                                        AS Vendor,
           TRY_CONVERT(decimal(5, 2), JSON_VALUE(value, '$.percentCharge'))     AS PercentCharge,
           ISNULL(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.dollarCharge')), 0) AS DollarCharge,
           JSON_VALUE(value, '$.reason')                                        AS Reason
    FROM dbo.PoApprovalRequests r CROSS APPLY OPENJSON(ISNULL(r.BackChargesJson, '[]'))
    WHERE r.RequestId = @RequestId;
END
GO

-- ----------------------------------------------------------------------------
-- PO_ApproveRequest - creates the PO in Sage (PO_SubmitRequest) and marks the request Approved.
-- All or nothing: if Sage creation fails the request stays Pending and the error is raised.
-- ----------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.PO_ApproveRequest
    @RequestId int,
    @ApprovedBy varchar(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @JobId bigint, @Vendor varchar(100), @Desc varchar(100), @Requester varchar(100), @DateRequested date, @RequiredOnSite date,
                @CreatedBy varchar(100), @Items nvarchar(max), @BackCharges nvarchar(max), @Phase int;

        SELECT @JobId = JobId, @Vendor = Vendor, @Desc = PoDescription, @Requester = Requester, @DateRequested = DateRequested,
               @RequiredOnSite = RequiredOnSite, @CreatedBy = CreatedBy, @Items = ItemsJson, @BackCharges = BackChargesJson, @Phase = PhaseNumber
        FROM dbo.PoApprovalRequests WITH (UPDLOCK, ROWLOCK)
        WHERE RequestId = @RequestId AND Status = 'Pending';

        IF @@ROWCOUNT = 0
        BEGIN
            RAISERROR('This PO request was not found or has already been approved or rejected.', 16, 1);
        END

        SET @BackCharges = ISNULL(@BackCharges, '[]');

        CREATE TABLE #NewPo (PoId varchar(20), PoRecNum bigint);
        INSERT INTO #NewPo (PoId, PoRecNum)
        EXEC dbo.PO_SubmitRequest @JobId = @JobId, @Vendor = @Vendor, @PoDescription = @Desc, @Requester = @Requester,
                                  @DateRequested = @DateRequested, @RequiredOnSite = @RequiredOnSite, @CreatedBy = @CreatedBy,
                                  @ItemsJson = @Items, @BackChargesJson = @BackCharges, @PhaseNumber = @Phase;

        IF NOT EXISTS (SELECT 1 FROM #NewPo)
        BEGIN
            RAISERROR('The PO could not be created in Sage.', 16, 1);
        END

        UPDATE r
        SET Status = 'Approved', DecidedBy = @ApprovedBy, DecidedDate = GETDATE(), PoId = n.PoId, PoRecNum = n.PoRecNum
        FROM dbo.PoApprovalRequests r CROSS JOIN #NewPo n
        WHERE r.RequestId = @RequestId;

        COMMIT TRANSACTION;

        SELECT PoId, PoRecNum FROM #NewPo;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ----------------------------------------------------------------------------
-- PO_RejectRequest - marks the request Rejected (kept for the record) so it leaves the queue. Nothing is created in Sage.
-- ----------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.PO_RejectRequest
    @RequestId int,
    @RejectedBy varchar(100),
    @Reason varchar(500)
AS
BEGIN
    SET NOCOUNT ON;

    IF LEN(LTRIM(RTRIM(ISNULL(@Reason, '')))) = 0
    BEGIN
        RAISERROR('Enter a reason for rejecting the PO.', 16, 1);
        RETURN;
    END

    UPDATE dbo.PoApprovalRequests
    SET Status = 'Rejected', DecidedBy = @RejectedBy, DecidedDate = GETDATE(), RejectReason = LTRIM(RTRIM(@Reason))
    WHERE RequestId = @RequestId AND Status = 'Pending';

    IF @@ROWCOUNT = 0
        RAISERROR('This PO request was not found or has already been approved or rejected.', 16, 1);
END
GO
