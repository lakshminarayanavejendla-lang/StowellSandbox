-- 2026-09-23 - Mike Smith: "No information was brought over from Bid Management".
-- sp_ConvertBidToProject only created the Sage job (actrec) and copied name/address/division/
-- retainage. The Project pages read ProjectLocation / ContractorInfo / ProjectInfo keyed by the
-- new job number, which were never populated - so GC address, sales tax district, client,
-- insurance/bonded/tax-exempt/invoice/payroll and net terms date all showed blank.
-- This adds those three inserts (guarded, so re-running never duplicates rows).
-- Everything else in the procedure is unchanged from the live definition.
USE SageSBQ;
GO
ALTER PROCEDURE dbo.sp_ConvertBidToProject
    @InternalBidID INT,
    @ModifiedBy VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OldDisplayID VARCHAR(20);
    DECLARE @NewDisplayID VARCHAR(20);
    DECLARE @BidName VARCHAR(200), @Address1 VARCHAR(200), @Address2 VARCHAR(200),
            @City VARCHAR(100), @State VARCHAR(10), @ZipCode VARCHAR(20), @Division VARCHAR(50);
    -- NEW (2026-09-23) - see this file's header. Only field added: RetainagePercentage.
    DECLARE @RetainagePercentage DECIMAL(5, 2);
    DECLARE @NewRecNum BIGINT;
    DECLARE @LockResult INT;
    BEGIN TRY
        INSERT INTO BidLog (ProcedureName, StepName, RelatedRecordID, LogMessage, PerformedBy)
        VALUES ('sp_ConvertBidToProject', 'Initialization', @InternalBidID, 'Started project conversion process.', @ModifiedBy);
        BEGIN TRANSACTION;
        EXEC @LockResult = sp_getapplock
            @Resource = @InternalBidID,
            @LockMode = 'Exclusive',
            @LockOwner = 'Transaction',
            @LockTimeout = 10000;
        IF @LockResult < 0
        BEGIN
            ROLLBACK TRANSACTION;
            INSERT INTO BidLog (ProcedureName, StepName, RelatedRecordID, LogMessage, PerformedBy)
            VALUES ('sp_ConvertBidToProject', 'Lock Failed', @InternalBidID, 'Could not acquire conversion lock (result ' + CAST(@LockResult AS VARCHAR(10)) + ') - another conversion may be in progress.', @ModifiedBy);
            SELECT 'Failed: Another conversion for this bid is already in progress' AS Result;
            RETURN;
        END
        SELECT
            @OldDisplayID = DisplayBidID,
            @BidName = BidName,
            @Address1 = Address1,
            @Address2 = Address2,
            @City = City,
            @State = State,
            @ZipCode = ZipCode,
            @Division = Division,
            @RetainagePercentage = RetainagePercentage
        FROM BidRecords
        WHERE InternalBidID = @InternalBidID AND IsProject = 0;
        IF @OldDisplayID IS NOT NULL
            BEGIN
                SET @NewDisplayID = 'P' + SUBSTRING(@OldDisplayID, 2, LEN(@OldDisplayID));
                INSERT INTO BidLog (ProcedureName, StepName, RelatedRecordID, LogMessage, PerformedBy)
                VALUES ('sp_ConvertBidToProject', 'Generate Project ID', @InternalBidID, 'Converting ID from ' + @OldDisplayID + ' to ' + @NewDisplayID, @ModifiedBy);
                SELECT @NewRecNum = ISNULL(MAX(recnum), 0) + 1 FROM StowellSandbox.dbo.actrec;
                WHILE EXISTS (SELECT 1 FROM StowellSandbox.dbo.actrec WHERE recnum = @NewRecNum)
                    SET @NewRecNum = @NewRecNum + 1;
                EXEC dbo.InsertActRec
                    @recnum = @NewRecNum,
                    @jobnme = @BidName,
                    @shtnme = @BidName,
                    @addrs1 = @Address1,
                    @addrs2 = @Address2,
                    @ctynme = @City,
                    @state_ = @State,
                    @zipcde = @ZipCode,
                    @retain = @RetainagePercentage;
                -- NEW (2026-09-23, Mike Smith - "No information was brought over from Bid Management"):
                -- copy the bid's details into the tables the Project pages read. Codes match the
                -- Project Details dropdowns: Yes = '1', No = '2'.
                IF NOT EXISTS (SELECT 1 FROM dbo.ProjectLocation WHERE JobID = CAST(@NewRecNum AS VARCHAR(20)))
                    INSERT INTO dbo.ProjectLocation (JobID, Jobsite, Address, Address2, City, State, SalesTaxDistrict)
                    SELECT CAST(@NewRecNum AS VARCHAR(20)), Jobsite, LEFT(Address1, 50), LEFT(Address2, 50),
                           LEFT(City, 50), LEFT(State, 50), LEFT(SalesTaxDistrict, 50)
                    FROM BidRecords WHERE InternalBidID = @InternalBidID;
                IF NOT EXISTS (SELECT 1 FROM dbo.ContractorInfo WHERE JobID = CAST(@NewRecNum AS VARCHAR(20)))
                    INSERT INTO dbo.ContractorInfo (JobID, Client, Address, Address2, City, State, zip, DateModified)
                    SELECT CAST(@NewRecNum AS VARCHAR(20)),
                           -- ClientName is stored as "<id> - <name>"; the Project page wants the id.
                           CASE WHEN CHARINDEX(' - ', ClientName) > 1 THEN LEFT(ClientName, CHARINDEX(' - ', ClientName) - 1) END,
                           LEFT(GC_Address1, 50), LEFT(GC_Address2, 50), LEFT(GC_City, 50), LEFT(GC_State, 50),
                           LEFT(GC_ZipCode, 5), GETDATE()
                    FROM BidRecords WHERE InternalBidID = @InternalBidID;
                IF NOT EXISTS (SELECT 1 FROM dbo.ProjectInfo WHERE JobID = CAST(@NewRecNum AS VARCHAR(20)))
                    INSERT INTO dbo.ProjectInfo (JobID, InsuranceType, Bonded, TaxExcempt, InvoiceSubmittal,
                                                 CertifiedPayroll, NetTermsDate, RetainagePerc, DateModified)
                    SELECT CAST(@NewRecNum AS VARCHAR(20)), LEFT(InsuranceType, 50),
                           CASE Bonded WHEN 'Yes' THEN '1' WHEN 'No' THEN '2' END,
                           CASE TaxExempt WHEN 'Yes' THEN '1' WHEN 'No' THEN '2' END,
                           LEFT(InvoiceSubmittal, 50), LEFT(CertifiedPayroll, 50), NetTermsDate,
                           RetainagePercentage, GETDATE()
                    FROM BidRecords WHERE InternalBidID = @InternalBidID;
                IF @Division IS NOT NULL AND @Division <> ''
                    INSERT INTO dbo.Divisions (recnum, Division) VALUES (@NewRecNum, @Division);
                INSERT INTO BidLog (ProcedureName, StepName, RelatedRecordID, LogMessage, PerformedBy)
                VALUES ('sp_ConvertBidToProject', 'Create Sage Job', @InternalBidID, 'Created StowellSandbox.dbo.actrec job ' + CONVERT(varchar(20), @NewRecNum) + ' for bid ' + @OldDisplayID + '.', @ModifiedBy);
                UPDATE BidRecords
                SET
                    DisplayBidID = @NewDisplayID,
                    IsProject = 1,
                    BidStatus = 'Won',
                    ProjectRecNum = @NewRecNum,
                    ModifiedDate = GETDATE()
                WHERE InternalBidID = @InternalBidID;
                INSERT INTO BidLog (ProcedureName, StepName, RelatedRecordID, LogMessage, PerformedBy)
                VALUES ('sp_ConvertBidToProject', 'Conversion Complete', @InternalBidID, 'Bid successfully converted to Project.', @ModifiedBy);
                COMMIT TRANSACTION;
                SELECT @NewDisplayID AS NewProjectID, @NewRecNum AS NewProjectRecNum, @BidName AS NewProjectName, 'Success' AS Result;
            END
        ELSE
            BEGIN
                INSERT INTO BidLog (ProcedureName, StepName, RelatedRecordID, LogMessage, PerformedBy)
                VALUES ('sp_ConvertBidToProject', 'Validation Failed', @InternalBidID, 'Conversion failed: Bid not found or is already a project.', @ModifiedBy);
                COMMIT TRANSACTION;
                SELECT 'Failed: Bid not found or already a project' AS Result;
            END
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage VARCHAR(4000) = ERROR_MESSAGE();
        INSERT INTO BidLog (ProcedureName, StepName, RelatedRecordID, LogMessage, PerformedBy)
        VALUES ('sp_ConvertBidToProject', 'ERROR', @InternalBidID, 'Update Failed. Error: ' + @ErrorMessage, @ModifiedBy);
        THROW;
    END CATCH
END
GO
