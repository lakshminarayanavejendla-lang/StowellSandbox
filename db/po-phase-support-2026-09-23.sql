-- 2026-09-23 - Moqups FORM-PO Request comment 'User must select Project Phase' (+ TAB-Purchase Orders 'show only Drafts for
-- this project and Phase'). Adds a phase to the PO request end to end:
--   * dbo.PoRequestDrafts.PhaseNumber (new column) - a draft remembers its phase
--   * PO_SaveDraft / PO_GetDrafts / PO_GetDraftById - store and return the draft's phase
--   * PO_SubmitRequest - writes the phase to the real Sage PO (pchord.phsnum) instead of leaving it 0
--   * PO_UpdatePo / PO_GetPoById - edit path keeps and returns the phase
-- Each procedure below is the live definition with only the phase additions; nothing else changes.
USE SageSBQ;
GO
IF COL_LENGTH('dbo.PoRequestDrafts', 'PhaseNumber') IS NULL
    ALTER TABLE dbo.PoRequestDrafts ADD PhaseNumber int NULL;
GO
ALTER PROCEDURE dbo.PO_SaveDraft
    @JobId bigint,
    @Vendor varchar(100),
    @PoDescription varchar(100),
    @Requester varchar(100),
    @DateRequested date,
    @RequiredOnSite date,
    @TotalAmount decimal(19, 2),
    @CreatedBy varchar(100),
    @ItemsJson nvarchar(max),
    @PhaseNumber int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DECLARE @DraftId int;

    INSERT INTO dbo.PoRequestDrafts (JobID, Vendor, PoDescription, Requester, DateRequested, RequiredOnSite, TotalAmount, CreatedBy, PhaseNumber)
    VALUES (@JobId, @Vendor, @PoDescription, @Requester, @DateRequested, @RequiredOnSite, @TotalAmount, @CreatedBy, @PhaseNumber);

    SET @DraftId = SCOPE_IDENTITY();

    INSERT INTO dbo.PoRequestDraftItems (DraftID, Item, RemainingBudget, ItemCost, ItemNote)
    SELECT @DraftId, JSON_VALUE(value, '$.item'), JSON_VALUE(value, '$.remainingBudget'), JSON_VALUE(value, '$.itemCost'), JSON_VALUE(value, '$.itemNote')
    FROM OPENJSON(@ItemsJson);

    COMMIT TRANSACTION;

    SELECT @DraftId AS DraftId;
END
GO
ALTER PROCEDURE dbo.PO_GetDrafts
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ID AS DraftId, JobID, Vendor, PoDescription, Requester, TotalAmount, CreatedBy, CreatedDate, Status, PhaseNumber
    FROM dbo.PoRequestDrafts
    ORDER BY CreatedDate DESC;
END
GO
ALTER PROCEDURE dbo.PO_GetDraftById
    @DraftId int
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ID AS DraftId, JobID, Vendor, PoDescription, Requester, DateRequested, RequiredOnSite, TotalAmount, CreatedBy, CreatedDate, Status, PhaseNumber
    FROM dbo.PoRequestDrafts WHERE ID = @DraftId;

    SELECT Item, RemainingBudget, ItemCost, ItemNote
    FROM dbo.PoRequestDraftItems WHERE DraftID = @DraftId ORDER BY ID;
END
GO
-- ----------------------------------------------------------------------------
-- 9) PO_SubmitRequest - now persists the selected cost code onto each pcorln
--    line (was omitted entirely, so no PO ever counted against Remaining
--    Budget regardless of the cost code picked in the UI). Also carries the
--    earlier collision-safe ordnum generation fix.
-- ----------------------------------------------------------------------------
ALTER PROCEDURE dbo.PO_SubmitRequest
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
    SET XACT_ABORT ON;

    DECLARE @VendorId bigint;
    SELECT @VendorId = recnum FROM StowellSandbox.dbo.actpay WHERE vndnme = @Vendor;
    IF @VendorId IS NULL
    BEGIN
        RAISERROR('Vendor ''%s'' was not found in the Sage vendor master (actpay). PO was not created.', 16, 1, @Vendor);
        RETURN;
    END

    BEGIN TRANSACTION;

    DECLARE @lockresult int;
    EXEC @lockresult = sp_getapplock @Resource = 'PO_SubmitRequest_Lock', @LockMode = 'Exclusive', @LockTimeout = 5000, @LockOwner = 'Transaction';
    IF @lockresult < 0
    BEGIN
        ROLLBACK TRANSACTION;
        RAISERROR('Could not acquire submission lock; try again.', 16, 1);
        RETURN;
    END

    DECLARE @NewIdNum uniqueidentifier = NEWID();
    DECLARE @NewRecNum bigint;
    DECLARE @NewOrdNum varchar(20);
    DECLARE @NextSeq int;
    DECLARE @TotalAmount decimal(19, 2);

    SELECT @TotalAmount = ISNULL(SUM(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.itemCost'))), 0)
    FROM OPENJSON(@ItemsJson);

    SELECT @NextSeq = COUNT(*) + 1 FROM StowellSandbox.dbo.pchord WHERE jobnum = @JobId;
    SET @NewOrdNum = CONVERT(varchar(20), @JobId) + '-' + CONVERT(varchar(10), @NextSeq);
    WHILE EXISTS (SELECT 1 FROM StowellSandbox.dbo.pchord WHERE ordnum = @NewOrdNum)
    BEGIN
        SET @NextSeq = @NextSeq + 1;
        SET @NewOrdNum = CONVERT(varchar(20), @JobId) + '-' + CONVERT(varchar(10), @NextSeq);
    END

    INSERT INTO StowellSandbox.dbo.pchord
        (_idnum, ordnum, orddte, vndnum, jobnum, dscrpt, status, subttl, pchttl, pchbal, entdte, usrnme, schdte, phsnum)
    VALUES
        (@NewIdNum, @NewOrdNum, @DateRequested, @VendorId, @JobId, @PoDescription, 1, @TotalAmount, @TotalAmount, @TotalAmount, @DateRequested, @CreatedBy, @RequiredOnSite, ISNULL(@PhaseNumber, 0));

    SET @NewRecNum = CAST(SCOPE_IDENTITY() AS bigint);

    ;WITH Items AS (
        SELECT
            ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS LineNum,
            JSON_VALUE(value, '$.item') AS ItemText,
            TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.itemCost')) AS ItemCost,
            JSON_VALUE(value, '$.itemNote') AS ItemNote,
            TRY_CONVERT(decimal(15, 3), JSON_VALUE(value, '$.costCode')) AS CostCode
        FROM OPENJSON(@ItemsJson)
    )
    INSERT INTO StowellSandbox.dbo.pcorln
        (_idnum, _idref, recnum, linnum, prtdsc, linqty, linprc, extttl, ntetxt, cstcde)
    SELECT
        NEWID(), @NewIdNum, @NewRecNum, LineNum, LEFT(ItemText, 75), 1, ISNULL(ItemCost, 0), ISNULL(ItemCost, 0),
        ISNULL(ItemNote, ''), CostCode
    FROM Items;

    INSERT INTO dbo.BackCharges (JobID, PONum, Vendor, PercentCharge, DollarCharge, Reason, CreatedBy)
    SELECT
        CONVERT(varchar(20), @JobId), @NewOrdNum,
        JSON_VALUE(value, '$.vendor'),
        TRY_CONVERT(decimal(5, 2), JSON_VALUE(value, '$.percentCharge')),
        ISNULL(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.dollarCharge')), 0),
        JSON_VALUE(value, '$.reason'),
        @CreatedBy
    FROM OPENJSON(@BackChargesJson);

    COMMIT TRANSACTION;

    SELECT @NewOrdNum AS PoId, @NewRecNum AS PoRecNum;
END
GO
-- ----------------------------------------------------------------------------
-- 10) PO_UpdatePo - NEW. Same cost-code persistence fix as PO_SubmitRequest,
--     for the edit/re-save path (full delete+reinsert of pcorln).
-- ----------------------------------------------------------------------------
ALTER PROCEDURE dbo.PO_UpdatePo
    @PoId varchar(20),
    @Vendor varchar(100),
    @PoDescription varchar(100),
    @Requester varchar(100),
    @DateRequested date,
    @RequiredOnSite date,
    @ItemsJson nvarchar(max),
    @BackChargesJson nvarchar(max),
    @PhaseNumber int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @RecNum bigint;
    SELECT @RecNum = recnum FROM StowellSandbox.dbo.pchord WHERE ordnum = @PoId;
    IF @RecNum IS NULL
    BEGIN
        RAISERROR('PO ''%s'' was not found.', 16, 1, @PoId);
        RETURN;
    END

    DECLARE @VendorId bigint;
    SELECT @VendorId = recnum FROM StowellSandbox.dbo.actpay WHERE vndnme = @Vendor;
    IF @VendorId IS NULL
    BEGIN
        RAISERROR('Vendor ''%s'' was not found in the Sage vendor master (actpay). PO was not updated.', 16, 1, @Vendor);
        RETURN;
    END

    BEGIN TRANSACTION;

    DECLARE @TotalAmount decimal(19, 2);
    SELECT @TotalAmount = ISNULL(SUM(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.itemCost'))), 0)
    FROM OPENJSON(@ItemsJson);

    UPDATE StowellSandbox.dbo.pchord
    SET vndnum = @VendorId,
        dscrpt = @PoDescription,
        usrnme = @Requester,
        orddte = @DateRequested,
        schdte = @RequiredOnSite,
        subttl = @TotalAmount,
        pchttl = @TotalAmount,
        pchbal = @TotalAmount,
        phsnum = ISNULL(@PhaseNumber, phsnum),
        upddte = GETDATE()
    WHERE recnum = @RecNum;

    DELETE FROM StowellSandbox.dbo.pcorln WHERE recnum = @RecNum;

    ;WITH Items AS (
        SELECT
            ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS LineNum,
            JSON_VALUE(value, '$.item') AS ItemText,
            TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.itemCost')) AS ItemCost,
            JSON_VALUE(value, '$.itemNote') AS ItemNote,
            TRY_CONVERT(decimal(15, 3), JSON_VALUE(value, '$.costCode')) AS CostCode
        FROM OPENJSON(@ItemsJson)
    )
    INSERT INTO StowellSandbox.dbo.pcorln
        (_idnum, _idref, recnum, linnum, prtdsc, linqty, linprc, extttl, ntetxt, cstcde)
    SELECT
        NEWID(), (SELECT _idnum FROM StowellSandbox.dbo.pchord WHERE recnum = @RecNum), @RecNum, LineNum,
        LEFT(ItemText, 75), 1, ISNULL(ItemCost, 0), ISNULL(ItemCost, 0), ISNULL(ItemNote, ''), CostCode
    FROM Items;

    DELETE FROM dbo.BackCharges WHERE PONum = @PoId;

    INSERT INTO dbo.BackCharges (JobID, PONum, Vendor, PercentCharge, DollarCharge, Reason, CreatedBy)
    SELECT
        CONVERT(varchar(20), (SELECT jobnum FROM StowellSandbox.dbo.pchord WHERE recnum = @RecNum)), @PoId,
        JSON_VALUE(value, '$.vendor'),
        TRY_CONVERT(decimal(5, 2), JSON_VALUE(value, '$.percentCharge')),
        ISNULL(TRY_CONVERT(decimal(19, 2), JSON_VALUE(value, '$.dollarCharge')), 0),
        JSON_VALUE(value, '$.reason'),
        @Requester
    FROM OPENJSON(@BackChargesJson);

    COMMIT TRANSACTION;

    SELECT 1 AS Updated;
END
GO
-- ----------------------------------------------------------------------------
-- 11) PO_GetPoById - NEW. Backs the "edit an already-submitted PO" flow; also
--     now returns each line's stored cost code so re-editing doesn't drop it.
-- ----------------------------------------------------------------------------
ALTER PROCEDURE dbo.PO_GetPoById
    @PoId varchar(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.ordnum AS PoId,
        CONVERT(varchar(20), p.jobnum) AS JobId,
        ISNULL(j.jobnme, CONVERT(varchar(20), p.jobnum)) AS JobName,
        p.usrnme AS Requester,
        ISNULL(v.vndnme, CONVERT(varchar(20), p.vndnum)) AS Vendor,
        p.dscrpt AS PoDescription,
        CONVERT(varchar(10), p.orddte, 101) AS DateRequested,
        CONVERT(varchar(10), p.schdte, 101) AS RequiredOnSite,
        p.pchttl AS TotalPoAmount,
        p.phsnum AS PhaseNumber
    FROM StowellSandbox.dbo.pchord p
    LEFT JOIN StowellSandbox.dbo.actrec j ON j.recnum = p.jobnum
    LEFT JOIN StowellSandbox.dbo.actpay v ON v.recnum = p.vndnum
    WHERE p.ordnum = @PoId;

    SELECT
        l.prtdsc AS Item,
        CAST(0 AS decimal(19,2)) AS RemainingBudget,
        l.linprc AS ItemCost,
        l.ntetxt AS ItemNote,
        l.cstcde AS CostCode
    FROM StowellSandbox.dbo.pcorln l
    INNER JOIN StowellSandbox.dbo.pchord p ON p.recnum = l.recnum
    WHERE p.ordnum = @PoId
    ORDER BY l.linnum;

    SELECT
        bc.Vendor,
        bc.PercentCharge,
        bc.DollarCharge,
        bc.Reason
    FROM dbo.BackCharges bc
    WHERE bc.PONum = @PoId
    ORDER BY bc.ID;
END
GO

