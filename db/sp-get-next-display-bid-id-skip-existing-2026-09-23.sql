-- 2026-09-23 - sp_GetNextDisplayBidID handed out the next counter value without checking it was
-- free. When the Settings counter fell behind the data (restore, manual inserts, etc.) it
-- produced IDs that already exist, so:
--   * "Create" failed with a UNIQUE KEY violation on BidRecords.DisplayBidID (e.g. B2600024), and
--   * "Bid Won" failed because B26000nn becomes P26000nn, which already belonged to another bid.
-- Now the counter keeps advancing until neither the B<yy><seq> nor the P<yy><seq> ID exists.
USE SageSBQ;
GO
ALTER PROCEDURE dbo.sp_GetNextDisplayBidID
    @CreatedBy VARCHAR(100),
    @DisplayBidID VARCHAR(20) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @CurrentYear INT = YEAR(GETDATE());
    DECLARE @YearCode VARCHAR(2) = RIGHT(CAST(@CurrentYear AS VARCHAR(4)), 2);
    DECLARE @Seq INT;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE Settings
        SET
            CurrentValue = CASE
                               WHEN CurrentYear = @CurrentYear THEN CurrentValue + 1
                               ELSE 1
                END,
            CurrentYear = @CurrentYear
        WHERE SequenceName = 'BidNumber';

        SELECT @Seq = CurrentValue FROM Settings WHERE SequenceName = 'BidNumber';
        SET @DisplayBidID = 'B' + @YearCode + RIGHT('00000' + CAST(@Seq AS VARCHAR(5)), 5);

        -- Skip numbers already used by a bid (B...) or by the project it was converted into (P...).
        WHILE EXISTS (
            SELECT 1 FROM BidRecords
            WHERE DisplayBidID IN (@DisplayBidID, 'P' + SUBSTRING(@DisplayBidID, 2, 19))
        )
        BEGIN
            UPDATE Settings SET CurrentValue = CurrentValue + 1 WHERE SequenceName = 'BidNumber';
            SELECT @Seq = CurrentValue FROM Settings WHERE SequenceName = 'BidNumber';
            SET @DisplayBidID = 'B' + @YearCode + RIGHT('00000' + CAST(@Seq AS VARCHAR(5)), 5);
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
