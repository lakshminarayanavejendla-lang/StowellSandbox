/* ----------------------------------------------------------------------------
   2026-09-24  Change Order allocation no longer double-counts the budget.

   A submitted allocation used to change the budget TWICE: it moved the amount on the job's budget
   lines (StowellSandbox.dbo.bdglin) AND wrote the change order lines (sbcgln), and every budget
   report adds bdglin + sbcgln together - so each allocation counted double.

   Now the allocation writes ONLY the change order lines (sbcgln, done by CO_SubmitBudgetReallocation,
   unchanged). CO_PostBudgetAllocationToSage keeps its safety checks and the setup a change order
   needs, but no longer changes any bdglin amount:
     - a deduction still needs the cost code to have a budget under the chosen phase, and
       nothing may go below zero (budget under a phase = its bdglin line + the change orders on it);
     - it still creates the job/phase/cost code rows a new cost code needs, plus a $0.00 budget line
       when the cost code has none yet on this job, so it shows up in the cost code lists.

   Allocations submitted BEFORE this change already changed bdglin as well - see DEPLOY_README.
   ---------------------------------------------------------------------------- */
ALTER PROCEDURE dbo.CO_PostBudgetAllocationToSage
    @AllocationId int,
    @Direction smallint,
    @PostedBy varchar(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Direction NOT IN (1, -1)
        THROW 50001, 'Direction must be 1 (apply) or -1 (reverse).', 1;

    DECLARE @JobId bigint, @CoNumber varchar(20);
    SELECT @JobId = TRY_CONVERT(bigint, JobId), @CoNumber = CoNumber
    FROM dbo.CoBudgetAllocations
    WHERE Id = @AllocationId;

    IF @JobId IS NULL
        THROW 50001, 'Allocation not found, or its Job ID is not a valid Sage job number.', 1;

    DECLARE @IdRef uniqueidentifier;
    SELECT @IdRef = _idnum FROM StowellSandbox.dbo.actrec WHERE recnum = @JobId;
    IF @IdRef IS NULL
        THROW 50001, 'Job ID does not exist in actrec.', 1;

    DECLARE @Phase int, @PhaseText varchar(50);
    SELECT TOP 1 @PhaseText = Phase FROM dbo.CoBudgetAllocationPhases WHERE AllocationId = @AllocationId ORDER BY Id;
    SET @Phase = ISNULL(TRY_CONVERT(int, LEFT(@PhaseText, CHARINDEX(' - ', @PhaseText + ' - ') - 1)), 0);
    DECLARE @PhaseName varchar(100) =
        ISNULL(NULLIF(LTRIM(RTRIM(CASE WHEN CHARINDEX(' - ', @PhaseText) > 0 THEN SUBSTRING(@PhaseText, CHARINDEX(' - ', @PhaseText) + 3, 100) END)), ''),
               CASE WHEN @Phase = 0 THEN 'None' ELSE 'Phase ' + CONVERT(varchar(10), @Phase) END);

    DECLARE @CurrentUser varchar(50);
    SELECT @CurrentUser = UserName FROM dbo.StowellUsers WHERE Email = @PostedBy;
    SET @CurrentUser = ISNULL(@CurrentUser, LEFT(ISNULL(@PostedBy, 'system'), 50));

    -- Net budget change per cost code (a cost code may appear on more than one line).
    CREATE TABLE #Post (CostCode decimal(15,3) NOT NULL PRIMARY KEY, Descr varchar(100) NULL, Delta decimal(19,2) NOT NULL);

    IF EXISTS (SELECT 1 FROM dbo.CoBudgetAllocationLines WHERE AllocationId = @AllocationId AND TRY_CONVERT(decimal(15,3), CostCode) IS NULL)
        THROW 50001, 'An allocation line has a cost code that is not a valid number.', 1;

    INSERT INTO #Post (CostCode, Descr, Delta)
    SELECT TRY_CONVERT(decimal(15,3), CostCode),
           MAX(CostCodeDescription),
           @Direction * SUM(Debit - Credit)
    FROM dbo.CoBudgetAllocationLines
    WHERE AllocationId = @AllocationId
    GROUP BY TRY_CONVERT(decimal(15,3), CostCode)
    HAVING SUM(Debit - Credit) <> 0;

    IF NOT EXISTS (SELECT 1 FROM #Post)
    BEGIN
        DROP TABLE #Post;
        RETURN;
    END

    -- Budget under this phase today = its budget line + the (non-void) change orders on the phase.
    -- On Submit the allocation's own change order lines are not written yet; on Reverse (delete) they still exist.
    CREATE TABLE #Cur (CostCode decimal(15,3) NOT NULL PRIMARY KEY, Budget decimal(19,2) NOT NULL);
    INSERT INTO #Cur (CostCode, Budget)
    SELECT x.cstcde, SUM(x.amt)
    FROM (
        SELECT b.cstcde, ISNULL(b.ttlbdg, 0) AS amt
        FROM StowellSandbox.dbo.bdglin b
        WHERE b.recnum = @JobId AND b.phsnum = @Phase
        UNION ALL
        SELECT s.cstcde, ISNULL(s.bdgprc, 0)
        FROM StowellSandbox.dbo.sbcgln s
        JOIN StowellSandbox.dbo.prmchg pc ON pc.recnum = s.recnum
        WHERE pc.jobnum = @JobId AND ISNULL(pc.phsnum, 0) = @Phase AND ISNULL(pc.status, 0) <> 5
    ) x
    JOIN #Post p ON p.CostCode = x.cstcde
    GROUP BY x.cstcde;

    IF EXISTS (
        SELECT 1 FROM #Post p
        WHERE p.Delta < 0 AND NOT EXISTS (SELECT 1 FROM #Cur c WHERE c.CostCode = p.CostCode))
        THROW 50001, 'Cannot deduct from a cost code that has no budget line on this job/phase.', 1;

    -- Refuse anything that would leave a negative budget (names the offending cost code).
    DECLARE @BadCode decimal(15,3);
    SELECT TOP 1 @BadCode = p.CostCode
    FROM #Post p
    LEFT JOIN #Cur c ON c.CostCode = p.CostCode
    WHERE ISNULL(c.Budget, 0) + p.Delta < 0;
    IF @BadCode IS NOT NULL
    BEGIN
        DECLARE @Msg nvarchar(400) = CONCAT('Posting this allocation would leave cost code ', CONVERT(varchar(30), @BadCode), ' with a negative budget.');
        THROW 50001, @Msg, 1;
    END

    IF @Direction = 1
    BEGIN
        -- Budget header row for the job (same as sp_BudgetTran).
        IF NOT EXISTS (SELECT 1 FROM StowellSandbox.dbo.budget WHERE recnum = @JobId)
            INSERT INTO StowellSandbox.dbo.budget (_idnum, recnum, lckedt, edtdte, usrnme, insdte, insusr)
            VALUES (NEWID(), @JobId, 0, CONVERT(date, SYSDATETIME()), CONCAT('stowellinc\', @CurrentUser), SYSDATETIME(), CONCAT('stowellinc\', @CurrentUser));

        DECLARE @BudgetId uniqueidentifier;
        SELECT @BudgetId = _idnum FROM StowellSandbox.dbo.budget WHERE recnum = @JobId;

        -- Phase rows (job + phase number only - see the 2026-09-20 duplicate-phase fix).
        IF NOT EXISTS (SELECT 1 FROM StowellSandbox.dbo.jobphs WHERE recnum = @JobId AND phsnum = 0)
            INSERT INTO StowellSandbox.dbo.jobphs (_idnum, _idref, recnum, phsnum, phsnme, insdte)
            VALUES (NEWID(), @IdRef, @JobId, 0, 'None', SYSDATETIME());
        IF @Phase <> 0 AND NOT EXISTS (SELECT 1 FROM StowellSandbox.dbo.jobphs WHERE recnum = @JobId AND phsnum = @Phase)
            INSERT INTO StowellSandbox.dbo.jobphs (_idnum, _idref, recnum, phsnum, phsnme, insdte)
            VALUES (NEWID(), @IdRef, @JobId, @Phase, @PhaseName, SYSDATETIME());

        -- Cost code rows (the change order lines have a foreign key to them).
        INSERT INTO StowellSandbox.dbo.cstcde (_idnum, recnum, cdenme, untdsc, divnum, dptnum, insdte, insusr, rtecde)
        SELECT NEWID(), p.CostCode, ISNULL(p.Descr, CONVERT(varchar(30), p.CostCode)), N'', 1, 1, SYSDATETIME(), CONCAT('stowellinc\', @CurrentUser), 0
        FROM #Post p
        WHERE NOT EXISTS (SELECT 1 FROM StowellSandbox.dbo.cstcde c WHERE c.recnum = p.CostCode);

        -- A cost code with no budget line at all on this job gets a $0.00 line so it appears in the cost code
        -- lists (its budget then comes from the change order lines). No existing line's amount is changed.
        DECLARE @NextLine int;
        SELECT @NextLine = ISNULL(MAX(linnum), 0) FROM StowellSandbox.dbo.bdglin WHERE recnum = @JobId;

        INSERT INTO StowellSandbox.dbo.bdglin (_idnum, _idref, recnum, phsnum, linnum, cstcde, othbdg, ttlbdg, othorg, ttlorg, insdte, insusr)
        SELECT NEWID(), @BudgetId, @JobId, @Phase, @NextLine + ROW_NUMBER() OVER (ORDER BY p.CostCode), p.CostCode,
               0, 0, 0, 0, SYSDATETIME(), CONCAT('stowellinc\', @CurrentUser)
        FROM #Post p
        WHERE NOT EXISTS (SELECT 1 FROM StowellSandbox.dbo.bdglin b WHERE b.recnum = @JobId AND b.cstcde = p.CostCode);
    END

    INSERT INTO SystemLog (LogDate, ProcedureName, Action, Details, UserName, JobID, CostCode)
    SELECT SYSDATETIME(), 'CO_PostBudgetAllocationToSage',
           CASE WHEN @Direction = 1 THEN 'Check Allocation' ELSE 'Check Allocation Reversal' END,
           CONCAT(@CoNumber, ' (allocation ', @AllocationId, '): budget change ', p.Delta, ' phase ', @Phase, ' (change order lines only)'),
           LEFT(@PostedBy, 50), @JobId, CONVERT(varchar(50), p.CostCode)
    FROM #Post p;

    DROP TABLE #Cur;
    DROP TABLE #Post;
END
GO
