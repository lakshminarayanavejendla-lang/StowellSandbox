-- 2026-09-26 - Mike Smith: change orders need Accounting approval (same rules as purchase orders - see po-approval-2026-09-26.sql).
--   Submit  -> the CO is held in dbo.CoApprovalRequests (status Pending) and is NOT created in Sage yet.
--   Approve -> the CO is created in Sage (exactly as CO_SubmitRequest always did) and the request is marked Approved.
--   Reject  -> the request is marked Rejected (with the reason) and drops out of the queue; nothing is created in Sage.
--
-- One new table and five procedures. CO_SubmitRequest itself is NOT changed - CO_ApproveRequest calls it with the stored values.
-- Run against the SageSBQ database.

USE SageSBQ;
GO

IF OBJECT_ID('dbo.CoApprovalRequests') IS NULL
BEGIN
    CREATE TABLE dbo.CoApprovalRequests (
        RequestId       int IDENTITY(1,1) NOT NULL CONSTRAINT PK_CoApprovalRequests PRIMARY KEY,
        JobId           bigint         NOT NULL,
        JobName         varchar(200)   NULL,
        PurchaseOrderId varchar(20)    NULL,
        Vendor          varchar(100)   NULL,
        CoReason        varchar(100)   NOT NULL,
        Requester       varchar(100)   NULL,
        DateRequested   date           NULL,
        RequiredOnSite  date           NULL,
        TotalAmount     decimal(19, 2) NOT NULL CONSTRAINT DF_CoApprovalRequests_Total DEFAULT 0,
        ItemsJson       nvarchar(max)  NOT NULL,
        BackChargesJson nvarchar(max)  NULL,
        CreatedBy       varchar(100)   NULL,
        SubmittedDate   datetime       NOT NULL CONSTRAINT DF_CoApprovalRequests_Submitted DEFAULT GETDATE(),
        Status          varchar(20)    NOT NULL CONSTRAINT DF_CoApprovalRequests_Status DEFAULT 'Pending'
                        CONSTRAINT CK_CoApprovalRequests_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
        DecidedBy       varchar(100)   NULL,
        DecidedDate     datetime       NULL,
        RejectReason    varchar(500)   NULL,
        CoId            varchar(20)    NULL,   -- the Sage change order number, set on approval
        CoRecNum        bigint         NULL
    );
    CREATE INDEX IX_CoApprovalRequests_Status ON dbo.CoApprovalRequests (Status, SubmittedDate);
END
GO

-- CO_SubmitForApproval - same parameters as CO_SubmitRequest; holds the CO
CREATE OR ALTER PROCEDURE dbo.CO_SubmitForApproval
    @JobId bigint,
    @PurchaseOrderId varchar(20),
    @Vendor varchar(100),
    @CoReason varchar(100),
    @Requester varchar(100),
    @DateRequested date,
    @RequiredOnSite date,
    @CreatedBy varchar(100),
    @ItemsJson nvarchar(max),
    @BackChargesJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;

    IF LEN(LTRIM(RTRIM(ISNULL(@CoReason, '')))) = 0
    BEGIN
        RAISERROR('Enter a CO reason before submitting.', 16, 1);
        RETURN;
    END

    DECLARE @Total decimal(19, 2) = ISNULL((SELECT SUM(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.itemCost'))) FROM OPENJSON(@ItemsJson)), 0);
    DECLARE @JobName varchar(200) = (SELECT TOP 1 jobnme FROM StowellSandbox.dbo.actrec WHERE recnum = @JobId);

    INSERT INTO dbo.CoApprovalRequests
        (JobId, JobName, PurchaseOrderId, Vendor, CoReason, Requester, DateRequested, RequiredOnSite, TotalAmount, ItemsJson, BackChargesJson, CreatedBy)
    VALUES
        (@JobId, @JobName, @PurchaseOrderId, @Vendor, LTRIM(RTRIM(@CoReason)), @Requester, @DateRequested, @RequiredOnSite, @Total,
         @ItemsJson, @BackChargesJson, @CreatedBy);

    SELECT CAST(SCOPE_IDENTITY() AS int) AS RequestId;
END
GO

-- CO_GetPendingApprovals - the Accounting CO queue
CREATE OR ALTER PROCEDURE dbo.CO_GetPendingApprovals
AS
BEGIN
    SET NOCOUNT ON;
    SELECT RequestId, JobId, JobName, PurchaseOrderId, Vendor, CoReason, Requester, CreatedBy, TotalAmount, SubmittedDate
    FROM dbo.CoApprovalRequests
    WHERE Status = 'Pending'
    ORDER BY SubmittedDate, RequestId;
END
GO

-- CO_GetApprovalRequest - one request for the approval screen (header, line items, back charges)
CREATE OR ALTER PROCEDURE dbo.CO_GetApprovalRequest
    @RequestId int
AS
BEGIN
    SET NOCOUNT ON;

    SELECT RequestId, JobId, JobName, PurchaseOrderId, Vendor, CoReason, Requester, TotalAmount, Status, RejectReason,
           CONVERT(varchar(10), DateRequested, 23)  AS DateRequested,
           CONVERT(varchar(10), RequiredOnSite, 23) AS RequiredOnSite
    FROM dbo.CoApprovalRequests
    WHERE RequestId = @RequestId;

    SELECT JSON_VALUE(value, '$.item')                                         AS Item,
           TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.remainingBudget')) AS RemainingBudget,
           TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.itemCost'))        AS ItemCost,
           JSON_VALUE(value, '$.itemNote')                                     AS ItemNote
    FROM dbo.CoApprovalRequests r CROSS APPLY OPENJSON(r.ItemsJson)
    WHERE r.RequestId = @RequestId;

    SELECT JSON_VALUE(value, '$.vendor')                                        AS Vendor,
           TRY_CONVERT(decimal(5, 2), JSON_VALUE(value, '$.percentCharge'))     AS PercentCharge,
           ISNULL(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.dollarCharge')), 0) AS DollarCharge,
           JSON_VALUE(value, '$.reason')                                        AS Reason
    FROM dbo.CoApprovalRequests r CROSS APPLY OPENJSON(ISNULL(r.BackChargesJson, '[]'))
    WHERE r.RequestId = @RequestId;
END
GO

-- CO_ApproveRequest - creates the CO in Sage (CO_SubmitRequest) and marks the request Approved.
-- All or nothing: if Sage creation fails the request stays Pending and the error is raised.
CREATE OR ALTER PROCEDURE dbo.CO_ApproveRequest
    @RequestId int,
    @ApprovedBy varchar(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @JobId bigint, @PoId varchar(20), @Vendor varchar(100), @Reason varchar(100), @Requester varchar(100), @DateRequested date,
                @RequiredOnSite date, @CreatedBy varchar(100), @Items nvarchar(max), @BackCharges nvarchar(max);

        SELECT @JobId = JobId, @PoId = PurchaseOrderId, @Vendor = Vendor, @Reason = CoReason, @Requester = Requester, @DateRequested = DateRequested,
               @RequiredOnSite = RequiredOnSite, @CreatedBy = CreatedBy, @Items = ItemsJson, @BackCharges = BackChargesJson
        FROM dbo.CoApprovalRequests WITH (UPDLOCK, ROWLOCK)
        WHERE RequestId = @RequestId AND Status = 'Pending';

        IF @@ROWCOUNT = 0
        BEGIN
            RAISERROR('This CO request was not found or has already been approved or rejected.', 16, 1);
        END

        SET @BackCharges = ISNULL(@BackCharges, '[]');

        CREATE TABLE #NewCo (CoId varchar(20), CoRecNum bigint);
        INSERT INTO #NewCo (CoId, CoRecNum)
        EXEC dbo.CO_SubmitRequest @JobId = @JobId, @PurchaseOrderId = @PoId, @Vendor = @Vendor, @CoReason = @Reason, @Requester = @Requester,
                                  @DateRequested = @DateRequested, @RequiredOnSite = @RequiredOnSite, @CreatedBy = @CreatedBy,
                                  @ItemsJson = @Items, @BackChargesJson = @BackCharges;

        IF NOT EXISTS (SELECT 1 FROM #NewCo)
        BEGIN
            RAISERROR('The change order could not be created in Sage.', 16, 1);
        END

        UPDATE r
        SET Status = 'Approved', DecidedBy = @ApprovedBy, DecidedDate = GETDATE(), CoId = n.CoId, CoRecNum = n.CoRecNum
        FROM dbo.CoApprovalRequests r CROSS JOIN #NewCo n
        WHERE r.RequestId = @RequestId;

        COMMIT TRANSACTION;

        SELECT CoId, CoRecNum FROM #NewCo;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- CO_RejectRequest - marks the request Rejected (kept for the record) so it leaves the queue. Nothing is created in Sage.
CREATE OR ALTER PROCEDURE dbo.CO_RejectRequest
    @RequestId int,
    @RejectedBy varchar(100),
    @Reason varchar(500)
AS
BEGIN
    SET NOCOUNT ON;

    IF LEN(LTRIM(RTRIM(ISNULL(@Reason, '')))) = 0
    BEGIN
        RAISERROR('Enter a reason for rejecting the change order.', 16, 1);
        RETURN;
    END

    UPDATE dbo.CoApprovalRequests
    SET Status = 'Rejected', DecidedBy = @RejectedBy, DecidedDate = GETDATE(), RejectReason = LTRIM(RTRIM(@Reason))
    WHERE RequestId = @RequestId AND Status = 'Pending';

    IF @@ROWCOUNT = 0
        RAISERROR('This CO request was not found or has already been approved or rejected.', 16, 1);
END
GO
