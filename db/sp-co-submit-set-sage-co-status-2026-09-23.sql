-- 2026-09-23 - Mike Smith / Moqups FORM-CO Reallocation comment: 'CO Status must match Sage -> Pull from Sage100 CO Status'.
-- The dropdown already lists Sage's change types, but CO_SubmitBudgetReallocation never wrote the chosen one to the Sage CO
-- (prmchg.chgtyp stayed NULL). It now looks the status up in chgtyp and sets prmchg.chgtyp. Nothing else changes.
USE SageSBQ;
GO
/* ----------------------------------------------------------------------------
   2) dbo.CO_SubmitBudgetReallocation - as of 2026-09-17 plus the budget posting (see the EXEC just
      before the prmchg/sbcgln inserts).
   ---------------------------------------------------------------------------- */ALTER PROCEDURE dbo.CO_SubmitBudgetReallocation
    @CoNumber varchar(20) = NULL,
    @JobId varchar(20),
    @JobName varchar(200),
    @CoType varchar(20),
    @CoDescription varchar(100),
    @CoReason varchar(200),
    @CoStatus varchar(50),
    @OverallBudget decimal(19,2),
    @ProfitOnSell decimal(19,2) = 0,
    @RequestedAmount decimal(19,2) = NULL,
    @ApprovedAmount decimal(19,2) = NULL,
    @CreatedBy varchar(100),
    @PhasesJson nvarchar(max),
    @LinesJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @CoType = 'Prime' AND (@RequestedAmount IS NULL OR @ApprovedAmount IS NULL)
    BEGIN
        RAISERROR('Requested Amount and Approved Amount are both required when CO Type is Prime.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    DECLARE @lockresult int;
    EXEC @lockresult = sp_getapplock @Resource = 'CO_SubmitBudgetReallocation_Lock', @LockMode = 'Exclusive', @LockTimeout = 5000, @LockOwner = 'Transaction';
    IF @lockresult < 0
    BEGIN
        ROLLBACK TRANSACTION;
        RAISERROR('Could not acquire submission lock; try again.', 16, 1);
        RETURN;
    END

    IF @CoNumber IS NULL OR LTRIM(RTRIM(@CoNumber)) = ''
    BEGIN
        DECLARE @Prefix varchar(4) = CASE WHEN @CoType = 'Prime' THEN 'BC' ELSE 'CO' END;
        DECLARE @Year varchar(4) = CONVERT(varchar(4), YEAR(GETDATE()));
        DECLARE @NextSeq int;
        SELECT @NextSeq = COUNT(*) + 1 FROM dbo.CoBudgetAllocations WHERE CoNumber LIKE @Prefix + @Year + '%' AND Status = 'Submitted';
        SET @CoNumber = @Prefix + @Year + RIGHT('0000' + CONVERT(varchar(10), @NextSeq), 4);
        WHILE EXISTS (
            SELECT 1 FROM dbo.CoBudgetAllocations WHERE CoNumber = @CoNumber AND Status = 'Submitted'
            UNION ALL
            SELECT 1 FROM StowellSandbox.dbo.prmchg WHERE chgnum = @CoNumber
        )
        BEGIN
            SET @NextSeq = @NextSeq + 1;
            SET @CoNumber = @Prefix + @Year + RIGHT('0000' + CONVERT(varchar(10), @NextSeq), 4);
        END
    END

    DECLARE @BudgetChangeTotal decimal(19,2);
    SELECT @BudgetChangeTotal = ISNULL(SUM(TRY_CONVERT(decimal(19,2), JSON_VALUE(value, '$.debit')) - TRY_CONVERT(decimal(19,2), JSON_VALUE(value, '$.credit'))), 0)
    FROM OPENJSON(@LinesJson);

    INSERT INTO dbo.CoBudgetAllocations
        (CoNumber, JobId, JobName, CoType, CoDescription, CoReason, CoStatus, OverallBudget, BudgetChangeTotal, ProfitOnSell, RequestedAmount, ApprovedAmount, Status, CreatedBy)
    VALUES
        (@CoNumber, @JobId, @JobName, @CoType, @CoDescription, @CoReason, @CoStatus, @OverallBudget, @BudgetChangeTotal, @ProfitOnSell, @RequestedAmount, @ApprovedAmount, 'Submitted', @CreatedBy);

    DECLARE @AllocationId int = SCOPE_IDENTITY();

    INSERT INTO dbo.CoBudgetAllocationPhases (AllocationId, Phase)
    SELECT @AllocationId, JSON_VALUE(value, '$.phase')
    FROM OPENJSON(@PhasesJson);

    ;WITH Lines AS (
        SELECT
            ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS LineNum,
            JSON_VALUE(value, '$.costCode') AS CostCode,
            JSON_VALUE(value, '$.costCodeDescription') AS CostCodeDescription,
            TRY_CONVERT(decimal(19,2), JSON_VALUE(value, '$.debit')) AS Debit,
            TRY_CONVERT(decimal(19,2), JSON_VALUE(value, '$.credit')) AS Credit
        FROM OPENJSON(@LinesJson)
    )
    INSERT INTO dbo.CoBudgetAllocationLines (AllocationId, CostCode, CostCodeDescription, Debit, Credit, LineNum)
    SELECT @AllocationId, CostCode, CostCodeDescription, ISNULL(Debit, 0), ISNULL(Credit, 0), LineNum
    FROM Lines;

    -- 2026-09-20 (Mike Smith: "deducting from budget when submitted ... get allocation doing same") -
    -- post the allocation's Debit/Credit lines to the REAL Sage budget (StowellSandbox.dbo.bdglin).
    -- Runs inside this transaction: if any line can't be posted the whole Submit (including the
    -- prmchg/sbcgln rows created below) rolls back and nothing is changed. It has to run BEFORE the
    -- sbcgln insert: that table has a foreign key to cstcde, and the posting is what creates the cstcde
    -- row for a cost code this job has never used.
    EXEC dbo.CO_PostBudgetAllocationToSage @AllocationId = @AllocationId, @Direction = 1, @PostedBy = @CreatedBy;
    DECLARE @SageIdNum uniqueidentifier = NEWID();
    DECLARE @SagePhase int;
    SELECT TOP 1 @SagePhase = TRY_CONVERT(int, LEFT(JSON_VALUE(value, '$.phase'), CHARINDEX(' - ', JSON_VALUE(value, '$.phase') + ' - ') - 1))
    FROM OPENJSON(@PhasesJson);
    SET @SagePhase = ISNULL(@SagePhase, 0);

    INSERT INTO StowellSandbox.dbo.prmchg
        (_idnum, chgnum, chgdte, jobnum, phsnum, dscrpt, reason, pchord, status, reqamt, appamt, entdte, usrnme, chgtyp)
    VALUES
        (@SageIdNum, @CoNumber, GETDATE(), @JobId, @SagePhase, LEFT(@CoDescription, 50), LEFT(ISNULL(@CoReason, ''), 50), '', 1,
         ISNULL(@RequestedAmount, @BudgetChangeTotal), ISNULL(@ApprovedAmount, @BudgetChangeTotal), GETDATE(), @CreatedBy,
   -- NEW (2026-09-23, Mike Smith - Moqups 'CO Status must match Sage' / 'Pull from Sage100 CO Status'): the chosen
   -- CO Status is a Sage100 change type (chgtyp.typnme); store its number on the Sage CO so it isn't left blank.
   (SELECT TOP 1 recnum FROM StowellSandbox.dbo.chgtyp WHERE UPPER(LTRIM(RTRIM(typnme))) = UPPER(LTRIM(RTRIM(@CoStatus)))));

    DECLARE @SageRecNum bigint = CAST(SCOPE_IDENTITY() AS bigint);

    ;WITH SageLines AS (
        SELECT
            ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS LineNum,
            JSON_VALUE(value, '$.costCode') AS CostCode,
            JSON_VALUE(value, '$.costCodeDescription') AS CostCodeDescription,
            TRY_CONVERT(decimal(19,2), JSON_VALUE(value, '$.debit')) AS Debit,
            TRY_CONVERT(decimal(19,2), JSON_VALUE(value, '$.credit')) AS Credit
        FROM OPENJSON(@LinesJson)
    )
    INSERT INTO StowellSandbox.dbo.sbcgln
        (_idnum, _idref, recnum, linnum, dscrpt, bdgprc, chgnum, cstcde)
    SELECT
        NEWID(), @SageIdNum, @SageRecNum, LineNum, LEFT(ISNULL(CostCodeDescription, ''), 50),
        ISNULL(Debit, 0) - ISNULL(Credit, 0), @CoNumber, TRY_CONVERT(decimal(15,3), CostCode)
    FROM SageLines;

    COMMIT TRANSACTION;

    SELECT @CoNumber AS CoNumber, @AllocationId AS AllocationId;
END
GO

