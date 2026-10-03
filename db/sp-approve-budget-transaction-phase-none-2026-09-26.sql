-- 2026-09-26 - Mike Smith (initial budget in the None phase): sp_ApproveBudgetTransaction meant to default the name of phase 0 to 'None'
-- but tested @LoopPhasename = NULL, which is never true in SQL (comparisons with NULL are unknown), so a NULL phase name was passed through.
-- Fixed to IS NULL (or blank). Nothing else changed.
USE SageSBQ;
GO
----------------------------------------------------------------------------
-- 7) sp_ApproveBudgetTransaction - fixed @RowsAffected being captured from the
--    wrong statement (a Local-only drafts update, always 0 rows for Sage/Modify
--    approvals), which silently rolled back every Modify Budget approval while
--    reporting success in the UI.
-- ----------------------------------------------------------------------------
ALTER PROCEDURE dbo.sp_ApproveBudgetTransaction @JobID BIGINT,
@BudgetApprovedBy VARCHAR(100),
@Phasenum INT
AS
BEGIN
  SET NOCOUNT ON;

  BEGIN TRY
    BEGIN TRANSACTION;

    DROP TABLE IF EXISTS #BudgetTranList;
    CREATE TABLE #BudgetTranList (
      RowID INT IDENTITY (1, 1) PRIMARY KEY
     ,CostCodeDescription VARCHAR(100)
     ,ApprovedBudget DECIMAL(19, 2)
     ,PhaseNumber INT
     ,PhaseName VARCHAR(100)
    );

    declare @phsnum int = @Phasenum

    INSERT INTO #BudgetTranList (CostCodeDescription, ApprovedBudget, PhaseNumber, PhaseName)
      SELECT CostCodeDescription, Budget, PhaseNumber, PhaseName
      FROM BudgetTransactions
      WHERE JobID = @JobID and COALESCE(ISApproved,0)=0 and PhaseNumber = @phsnum

    UPDATE BudgetTransactions
    SET ISApproved = 1, BudgetApprovedBy = @BudgetApprovedBy, ApprovedDate = GETDATE()
    WHERE JobID = @JobID AND PhaseNumber = @phsnum AND ISApproved = 0;

    DECLARE @RowsAffected INT = @@ROWCOUNT;

    UPDATE BudgetTransactionDrafts
    SET ISSubmitted = 1, SubmittedDate = GETDATE(), SubmittedBy = @BudgetApprovedBy
    WHERE JobID = @JobID AND PhaseNumber = @phsnum AND ISSubmitted = 1;

    IF @RowsAffected > 0
    BEGIN
      DECLARE @CurrentRow INT = 1;
      DECLARE @MaxRow INT;
      SELECT @MaxRow = COUNT(*) FROM #BudgetTranList;

      DECLARE @LoopCostCodeDescription VARCHAR(100)
             ,@LoopApprovedBudget DECIMAL(19, 2)
             ,@LoopPhsnum INT
             ,@LoopPhasename VARCHAR(100);

      WHILE @CurrentRow <= @MaxRow
      BEGIN
        SELECT
          @LoopCostCodeDescription = CostCodeDescription
         ,@LoopApprovedBudget = ApprovedBudget
         ,@LoopPhsnum = PhaseNumber
         ,@LoopPhasename = PhaseName
        FROM #BudgetTranList
        WHERE RowID = @CurrentRow;

        IF @LoopPhsnum = 0 AND (@LoopPhasename IS NULL OR LTRIM(RTRIM(@LoopPhasename)) = '')
          SET @LoopPhasename = 'None'

        EXEC sp_BudgetTran @JobID = @JobID
                          ,@User = @BudgetApprovedBy
                          ,@CostCodeDescription = @LoopCostCodeDescription
                          ,@Budget = @LoopApprovedBudget
                          ,@PhsNum = @LoopPhsnum
                          ,@phsname = @LoopPhasename;

        SET @CurrentRow = @CurrentRow + 1;
      END

      UPDATE SageBudgetTransactionDrafts SET ISSubmitted =1 where JobID = @JobID AND PhaseNumber = @phsnum and isnull(issubmitted,0)=0

      INSERT INTO BudgetTransactionLog (TransactionID, JobID, Action, CostCodeDescription, Budget,
        PhaseNumber, PhaseName, BudgetSubmittedBy, SubmittedDate, BudgetApprovedBy, ApprovedDate,
        IsNewBudget, ISApproved, LogDate, LogUser)
        SELECT
          ID, JobID, 'APPROVE', CostCodeDescription, ApprovedBudget,
          PhaseNumber, PhaseName, BudgetSubmittedBy, SubmittedDate, @BudgetApprovedBy, GETDATE(),
          IsNewBudget, 1, GETDATE(), SUSER_SNAME()
        FROM BudgetTransactions
        WHERE JobID = @JobID AND ISApproved = 1;

      COMMIT TRANSACTION;

      SELECT @RowsAffected AS RowsAffected;
    END
    ELSE
    BEGIN
      IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

      SELECT 0 AS RowsAffected;
    END
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    SELECT
      ERROR_NUMBER() AS ErrorNumber
     ,ERROR_MESSAGE() AS ErrorMessage
     ,0 AS RowsAffected;
  END CATCH
END
GO
