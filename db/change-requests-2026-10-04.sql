-- 2026-10-04 - Approval for changes to records that are already in Sage (step 2 of "everything goes through approval").
--
-- Before: Edit PO (PO_UpdatePo), Edit CO (CO_UpdateCo) and deleting a posted CO budget allocation
-- (CO_DeleteBudgetReallocation) wrote straight to Sage the moment the PM saved. Marking a PO complete
-- (PO_CompletePo) also wrote straight to Sage (no screen uses it yet).
--
-- Now: the PM's change is saved here, in dbo.ChangeRequests, as Pending, with a snapshot of how the Sage
-- record looks today. Nothing in Sage changes until Accounting approves; Approve runs the same procedure
-- that used to run immediately. Reject keeps Sage untouched and records a reason. If applying an approved
-- change fails, the request stays Pending with the error in ApplyError so nothing is half-applied.
--
-- Nothing here changes an existing procedure or table. Run once against SageSBQ.
USE SageSBQ;
GO
-- the filtered index below needs these on (sqlcmd turns QUOTED_IDENTIFIER off unless it is run with -I)
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID('dbo.ChangeRequests', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChangeRequests (
        Id           int IDENTITY(1, 1) CONSTRAINT PK_ChangeRequests PRIMARY KEY,
        Entity       varchar(10)   NOT NULL,            -- 'PO' | 'CO' | 'COALLOC' (CO budget allocation)
        EntityId     varchar(50)   NOT NULL,            -- PO number, CO number, or allocation id
        JobId        varchar(20)   NULL,
        ChangeType   varchar(20)   NOT NULL,            -- 'Edit' | 'Complete' | 'Delete'
        Summary      nvarchar(300) NULL,
        PayloadJson  nvarchar(max) NULL,                -- the PM's new values (same JSON the old direct call used)
        BeforeJson   nvarchar(max) NULL,                -- how the Sage record looked when the change was requested
        Status       varchar(10)   NOT NULL CONSTRAINT DF_ChangeRequests_Status DEFAULT ('Pending'),
        RequestedBy  varchar(100)  NOT NULL,
        RequestedAt  datetime2(0)  NOT NULL CONSTRAINT DF_ChangeRequests_At DEFAULT (SYSDATETIME()),
        DecidedBy    varchar(100)  NULL,
        DecidedAt    datetime2(0)  NULL,
        RejectReason nvarchar(500) NULL,
        ApplyError   nvarchar(1000) NULL,
        CONSTRAINT CK_ChangeRequests_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
        CONSTRAINT CK_ChangeRequests_Entity CHECK (Entity IN ('PO', 'CO', 'COALLOC')),
        CONSTRAINT CK_ChangeRequests_Type   CHECK (ChangeType IN ('Edit', 'Complete', 'Delete'))
    );
END
GO

-- only one open request per record and kind of change (separate from the table so a re-run fills in anything missing)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_ChangeRequests_OnePending' AND object_id = OBJECT_ID('dbo.ChangeRequests'))
    CREATE UNIQUE INDEX UX_ChangeRequests_OnePending ON dbo.ChangeRequests (Entity, EntityId, ChangeType) WHERE Status = 'Pending';
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ChangeRequests_Status' AND object_id = OBJECT_ID('dbo.ChangeRequests'))
    CREATE INDEX IX_ChangeRequests_Status ON dbo.ChangeRequests (Status, RequestedAt DESC);
GO

-- Request a change. Returns the new request id (and raises an error if one is already waiting, or the record isn't there).
CREATE OR ALTER PROCEDURE dbo.Change_Request
    @Entity      varchar(10),
    @EntityId    varchar(50),
    @ChangeType  varchar(20),
    @PayloadJson nvarchar(max) = NULL,
    @RequestedBy varchar(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @JobId varchar(20), @Before nvarchar(max), @Summary nvarchar(300);
    DECLARE @Total decimal(19, 2) = (SELECT ISNULL(SUM(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.itemCost'))), 0) FROM OPENJSON(ISNULL(JSON_QUERY(@PayloadJson, '$.items'), '[]')));

    IF EXISTS (SELECT 1 FROM dbo.ChangeRequests WHERE Entity = @Entity AND EntityId = @EntityId AND ChangeType = @ChangeType AND Status = 'Pending')
    BEGIN
        RAISERROR('A %s change for %s is already waiting for Accounting''s approval.', 16, 1, @ChangeType, @EntityId);
        RETURN;
    END

    IF @Entity = 'PO'
    BEGIN
        SELECT @JobId = CONVERT(varchar(20), jobnum) FROM StowellSandbox.dbo.pchord WHERE ordnum = @EntityId;
        IF @JobId IS NULL BEGIN RAISERROR('PO ''%s'' was not found in Sage.', 16, 1, @EntityId); RETURN; END

        SET @Before = (
            SELECT h.ordnum AS poNumber, v.vndnme AS vendor, h.dscrpt AS poDescription, h.usrnme AS requester,
                   h.orddte AS dateRequested, h.schdte AS requiredOnSite, h.pchttl AS total, h.phsnum AS phaseNumber, h.status AS sageStatus,
                   (SELECT l.linnum AS line, l.prtdsc AS item, l.extttl AS itemCost, l.ntetxt AS itemNote, l.cstcde AS costCode
                      FROM StowellSandbox.dbo.pcorln l WHERE l.recnum = h.recnum ORDER BY l.linnum FOR JSON PATH) AS items
              FROM StowellSandbox.dbo.pchord h
              LEFT JOIN StowellSandbox.dbo.actpay v ON v.recnum = h.vndnum
             WHERE h.ordnum = @EntityId
               FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);

        SET @Summary = CASE @ChangeType
            WHEN 'Complete' THEN CONCAT('Mark PO ', @EntityId, ' complete')
            ELSE CONCAT('Edit PO ', @EntityId, ' - ', ISNULL(JSON_VALUE(@PayloadJson, '$.vendor'), ''), ', new total ', FORMAT(@Total, 'N2')) END;
    END
    ELSE IF @Entity = 'CO'
    BEGIN
        SELECT @JobId = CONVERT(varchar(20), jobnum) FROM StowellSandbox.dbo.prmchg WHERE chgnum = @EntityId;
        IF @JobId IS NULL BEGIN RAISERROR('CO ''%s'' was not found in Sage.', 16, 1, @EntityId); RETURN; END

        SET @Before = (
            SELECT h.chgnum AS coNumber, h.pchord AS purchaseOrder, h.reason AS coReason, h.usrnme AS requester, h.chgdte AS dateRequested,
                   h.reqamt AS total, h.status AS sageStatus,
                   (SELECT l.linnum AS line, l.dscrpt AS item, l.bdgprc AS itemCost, l.ntetxt AS itemNote
                      FROM StowellSandbox.dbo.sbcgln l WHERE l.chgnum = h.chgnum ORDER BY l.linnum FOR JSON PATH) AS items
              FROM StowellSandbox.dbo.prmchg h
             WHERE h.chgnum = @EntityId
               FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);

        SET @Summary = CONCAT('Edit CO ', @EntityId, ' - new total ', FORMAT(@Total, 'N2'));
    END
    ELSE IF @Entity = 'COALLOC'
    BEGIN
        DECLARE @AllocStatus varchar(20), @CoNumber varchar(20);
        SELECT @JobId = JobId, @AllocStatus = Status, @CoNumber = CoNumber FROM dbo.CoBudgetAllocations WHERE Id = TRY_CONVERT(int, @EntityId);
        IF @AllocStatus IS NULL BEGIN RAISERROR('CO budget allocation %s was not found.', 16, 1, @EntityId); RETURN; END
        IF @AllocStatus <> 'Submitted' BEGIN RAISERROR('Only an allocation already posted to Sage needs approval to delete.', 16, 1); RETURN; END

        SET @Before = (SELECT a.Id, a.CoNumber, a.JobId, a.JobName, a.CoType, a.CoDescription, a.CoReason, a.RequestedAmount, a.ApprovedAmount, a.Status
                         FROM dbo.CoBudgetAllocations a WHERE a.Id = TRY_CONVERT(int, @EntityId) FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
        SET @Summary = CONCAT('Delete CO budget allocation ', @EntityId, ' (CO ', ISNULL(@CoNumber, '-'), '); reverses its posting in Sage');
    END
    ELSE
    BEGIN
        RAISERROR('Unknown record type ''%s''.', 16, 1, @Entity);
        RETURN;
    END

    INSERT INTO dbo.ChangeRequests (Entity, EntityId, JobId, ChangeType, Summary, PayloadJson, BeforeJson, RequestedBy)
    VALUES (@Entity, @EntityId, @JobId, @ChangeType, @Summary, @PayloadJson, @Before, @RequestedBy);

    SELECT CONVERT(int, SCOPE_IDENTITY()) AS Id;
END
GO

-- The list for Accounting (Pending by default), newest last so the oldest request is handled first.
CREATE OR ALTER PROCEDURE dbo.Change_GetList
    @Status varchar(10) = 'Pending',
    @Entity varchar(10) = NULL,
    @EntityId varchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.Id, c.Entity, c.EntityId, c.JobId,
           (SELECT TOP 1 a.jobnme FROM StowellSandbox.dbo.actrec a WHERE CONVERT(varchar(20), a.recnum) = c.JobId) AS JobName,
           c.ChangeType, c.Summary, c.PayloadJson, c.BeforeJson, c.Status, c.RequestedBy, c.RequestedAt,
           c.DecidedBy, c.DecidedAt, c.RejectReason, c.ApplyError
      FROM dbo.ChangeRequests c
     WHERE (@Status IS NULL OR c.Status = @Status)
       AND (@Entity IS NULL OR c.Entity = @Entity)
       AND (@EntityId IS NULL OR c.EntityId = @EntityId)
     ORDER BY c.RequestedAt, c.Id;
END
GO

-- Approve: apply the change to Sage with the same procedure that used to run at once, then mark it Approved.
-- No result set. On failure the request stays Pending and ApplyError says why (callers read the row back).
CREATE OR ALTER PROCEDURE dbo.Change_Approve
    @Id         int,
    @ApprovedBy varchar(100)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Entity varchar(10), @EntityId varchar(50), @Type varchar(20), @P nvarchar(max), @Status varchar(10), @RequestedBy varchar(100);
    SELECT @Entity = Entity, @EntityId = EntityId, @Type = ChangeType, @P = PayloadJson, @Status = Status, @RequestedBy = RequestedBy
      FROM dbo.ChangeRequests WHERE Id = @Id;

    IF @Status IS NULL BEGIN RAISERROR('Change request %d was not found.', 16, 1, @Id); RETURN; END
    IF @Status <> 'Pending' BEGIN RAISERROR('Change request %d was already %s.', 16, 1, @Id, @Status); RETURN; END

    BEGIN TRY
        IF @Entity = 'PO' AND @Type = 'Edit'
        BEGIN
            DECLARE @pVendor varchar(100) = JSON_VALUE(@P, '$.vendor'), @pDesc varchar(100) = JSON_VALUE(@P, '$.poDescription'),
                    @pReq varchar(100) = ISNULL(JSON_VALUE(@P, '$.createdBy'), @RequestedBy),
                    @pDate date = TRY_CONVERT(date, JSON_VALUE(@P, '$.dateRequested')), @pOnSite date = TRY_CONVERT(date, JSON_VALUE(@P, '$.requiredOnSite')),
                    @pItems nvarchar(max) = ISNULL(JSON_QUERY(@P, '$.items'), '[]'), @pBack nvarchar(max) = ISNULL(JSON_QUERY(@P, '$.backCharges'), '[]'),
                    @pPhase int = TRY_CONVERT(int, JSON_VALUE(@P, '$.phaseNumber'));
            EXEC dbo.PO_UpdatePo @PoId = @EntityId, @Vendor = @pVendor, @PoDescription = @pDesc, @Requester = @pReq, @DateRequested = @pDate,
                 @RequiredOnSite = @pOnSite, @ItemsJson = @pItems, @BackChargesJson = @pBack, @PhaseNumber = @pPhase;
        END
        ELSE IF @Entity = 'PO' AND @Type = 'Complete'
        BEGIN
            EXEC dbo.PO_CompletePo @PoId = @EntityId;
        END
        ELSE IF @Entity = 'CO' AND @Type = 'Edit'
        BEGIN
            DECLARE @cPo varchar(20) = JSON_VALUE(@P, '$.purchaseOrderId'), @cReason varchar(100) = JSON_VALUE(@P, '$.coReason'),
                    @cReq varchar(100) = ISNULL(JSON_VALUE(@P, '$.createdBy'), @RequestedBy),
                    @cDate date = TRY_CONVERT(date, JSON_VALUE(@P, '$.dateRequested')), @cOnSite date = TRY_CONVERT(date, JSON_VALUE(@P, '$.requiredOnSite')),
                    @cItems nvarchar(max) = ISNULL(JSON_QUERY(@P, '$.items'), '[]'), @cBack nvarchar(max) = ISNULL(JSON_QUERY(@P, '$.backCharges'), '[]');
            EXEC dbo.CO_UpdateCo @CoId = @EntityId, @PurchaseOrderId = @cPo, @CoReason = @cReason, @Requester = @cReq, @DateRequested = @cDate,
                 @RequiredOnSite = @cOnSite, @ItemsJson = @cItems, @BackChargesJson = @cBack;
        END
        ELSE IF @Entity = 'COALLOC' AND @Type = 'Delete'
        BEGIN
            -- the procedure also returns a result set (the CO number); the caller runs this with ExecuteNonQuery, which ignores it
            DECLARE @allocId int = TRY_CONVERT(int, @EntityId);
            EXEC dbo.CO_DeleteBudgetReallocation @AllocationId = @allocId, @DeletedBy = @ApprovedBy;
        END
        ELSE
        BEGIN
            RAISERROR('Don''t know how to apply a %s change to %s.', 16, 1, @Type, @Entity);
        END

        UPDATE dbo.ChangeRequests SET Status = 'Approved', DecidedBy = @ApprovedBy, DecidedAt = SYSDATETIME(), ApplyError = NULL WHERE Id = @Id;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        UPDATE dbo.ChangeRequests SET ApplyError = LEFT(ERROR_MESSAGE(), 1000) WHERE Id = @Id;
        THROW;
    END CATCH
END
GO

-- Reject: Sage is left exactly as it was. A reason is required.
CREATE OR ALTER PROCEDURE dbo.Change_Reject
    @Id         int,
    @RejectedBy varchar(100),
    @Reason     nvarchar(500)
AS
BEGIN
    SET NOCOUNT ON;
    IF NULLIF(LTRIM(RTRIM(@Reason)), '') IS NULL BEGIN RAISERROR('A reason is required to reject a change.', 16, 1); RETURN; END

    UPDATE dbo.ChangeRequests
       SET Status = 'Rejected', DecidedBy = @RejectedBy, DecidedAt = SYSDATETIME(), RejectReason = LTRIM(RTRIM(@Reason))
     WHERE Id = @Id AND Status = 'Pending';

    IF @@ROWCOUNT = 0 RAISERROR('Change request %d is not waiting for a decision.', 16, 1, @Id);
END
GO
