/* =============================================================================================
   2026-09-22 / 2026-09-23 - ALL database changes for Mike Smith's remarks (ONE deploy file)
   Database: SageSBQ (the procedures also read StowellSandbox, as they always have).

   HOW TO RUN: sqlcmd -S <server> -E -C -b -i 2026-09-23-mike-smith-fixes-all-in-one.sql
   Every section is re-runnable (ALTER / CREATE OR ALTER / guarded column add).

   !! READ FIRST: each ALTER PROCEDURE below was generated from the procedure as it stands on the DEV
   database and REPLACES the target's version. Run this only on an environment whose procedures are at the
   same baseline as dev (i.e. that already has the earlier PO/CO module scripts of 2026-09-10 .. 09-20,
   notably CO_PostBudgetAllocationToSage, which CO_SubmitBudgetReallocation calls).
   Run it against a backup/test copy first if unsure.

   CONTENTS
    1. InsertActRec                - (yesterday, late night) accepts @retain so Bid Won carries retainage into the Sage job
    2. sp_ConvertBidToProject      - Bid Won: copy the bid's details (GC address/client, sales tax district, net terms,
                                     insurance/bonded/tax exempt/invoice/payroll, retainage) to the Project pages'
                                     tables (ProjectLocation / ContractorInfo / ProjectInfo)
                                     ("No information was brought over from Bid Management")
    3. sp_GetNextDisplayBidID      - new bid numbers skip any B/P number already in use (create + Bid Won collisions)
    4. SPCostSummary               - Remaining subtracts OPEN POs (Committed column) + #temp.cstcde widened varchar(10)->(20) (8-digit jobs overflowed)
    5. PO_GetJobPhases             - phase list includes phases added in the app (BidPhase)
    6. PO_GetJobOverview           - PO list returns PoPhase, CO log returns CoPhase (filter PO/CO tabs by phase)
    7. PO phase support            - PoRequestDrafts.PhaseNumber + PO_SaveDraft / PO_GetDrafts / PO_GetDraftById /
                                     PO_SubmitRequest / PO_UpdatePo / PO_GetPoById (PO phase saved to Sage pchord.phsnum)
    8. CO_SubmitBudgetReallocation - the chosen CO Status is written to the Sage CO (prmchg.chgtyp)
    9. Invoices_GetJobInvoices     - NEW read for the Invoices tab (Sage acrinv, with phase)
   10. ApiCallLog                 - NEW table + view + purge proc: logs EVERY API call (all users, with username/time/status/duration) and every error
   ============================================================================================= */


/* ---------------------------------------------------------------------------------------------
   SECTION 1  (source: sec0-insertactrec.sql)
   --------------------------------------------------------------------------------------------- */
-- 2026-09-22/23 (late night) - InsertActRec now accepts @retain (retainage %) so a project created by Bid Won carries the bid's
-- retainage into the new Sage job (actrec). sp_ConvertBidToProject (next section) passes @retain to it.
USE SageSBQ;
GO
ALTER PROCEDURE [dbo].[InsertActRec] @recnum BIGINT,
@jobnme NVARCHAR(75) = NULL,
@shtnme NVARCHAR(30) = NULL,
@clnnum BIGINT = NULL,
@contct NVARCHAR(50) = NULL,
@addrs1 NVARCHAR(50) = NULL,
@addrs2 NVARCHAR(50) = NULL,
@ctynme NVARCHAR(50) = NULL,
@state_ NVARCHAR(2) = NULL,
@zipcde NVARCHAR(10) = NULL,
@phnnum NVARCHAR(14) = NULL,
@faxnum NVARCHAR(14) = NULL,
@achtct BIGINT = NULL,
@lender BIGINT = NULL,
@sprvsr BIGINT = NULL,
@slsemp BIGINT = NULL,
@estemp BIGINT = NULL,
@usrdf1 NVARCHAR(50) = NULL,
@usrdf2 NVARCHAR(50) = NULL,
@lcltax INT = NULL,
@slstax INT = NULL,
@lgract BIGINT = NULL,
@dptmnt BIGINT = NULL,
@dscdte NVARCHAR(6) = NULL,
@duedte NVARCHAR(6) = NULL,
@dsccnt DECIMAL(5, 2) = NULL,
@finchg DECIMAL(5, 2) = NULL,
@retain DECIMAL(5, 2) = NULL,
@cntrct DECIMAL(14, 2) = NULL,
@begbal DECIMAL(14, 2) = NULL,
@endbal DECIMAL(14, 2) = NULL,
@biddte DATE = NULL,
@plnrcv DATE = NULL,
@actbid DATE = NULL,
@ctcdte DATE = NULL,
@prelen DATE = NULL,
@sttdte DATE = NULL,
@cmpdte DATE = NULL,
@lenfld DATE = NULL,
@lenrls DATE = NULL,
@jobtyp SMALLINT = NULL,
@status TINYINT = NULL,
@pstwip TINYINT = NULL,
@crtfid TINYINT = NULL,
@connum NVARCHAR(30) = NULL,
@pchord NVARCHAR(30) = NULL,
@imgfle NVARCHAR(MAX) = NULL,
@csttym NVARCHAR(1) = NULL,
@csttyl NVARCHAR(1) = NULL,
@csttye NVARCHAR(1) = NULL,
@csttys NVARCHAR(1) = NULL,
@csttyo NVARCHAR(1) = NULL,
@usrcs6 NVARCHAR(1) = NULL,
@usrcs7 NVARCHAR(1) = NULL,
@usrcs8 NVARCHAR(1) = NULL,
@usrcs9 NVARCHAR(1) = NULL,
@ntetxt NVARCHAR(MAX) = NULL,
@export NVARCHAR(MAX) = NULL,
@lotclr NVARCHAR(30) = NULL,
@lotprm DECIMAL(12, 2) = 0,
@plnprc DECIMAL(12, 2) = 0,
@actprc DECIMAL(12, 2) = 0,
@estdte DATE = NULL,
@actdte DATE = NULL,
@lotnum NVARCHAR(10) = NULL,
@modnme NVARCHAR(30) = NULL,
@sqarft BIGINT = NULL,
@usrlst NVARCHAR(1000) = NULL,
@catxex TINYINT = NULL,
@pstexm TINYINT = NULL,
@insdte DATETIME = NULL,
@insusr SYSNAME = NULL,
@upddte DATETIME = NULL,
@updusr SYSNAME = NULL,
@inactv TINYINT = NULL,
@fedsck TINYINT = NULL,
@stmeml NVARCHAR(75) = NULL,
@ncrtck TINYINT = NULL,
@rtejob TINYINT = NULL,
@rtervw BIGINT = NULL,
@county NVARCHAR(50) = NULL,
@fednum NVARCHAR(25) = NULL,
@stenum NVARCHAR(25) = NULL,
@awddte DATE = NULL,
@strdte DATE = NULL,
@dtecmp DATE = NULL,
@pctcmp INT = NULL,
@typwrk NVARCHAR(50) = NULL,
@subcnt TINYINT = NULL,
@prmnme NVARCHAR(50) = NULL,
@prmadd NVARCHAR(50) = NULL,
@prmcty NVARCHAR(50) = NULL,
@prmste NVARCHAR(2) = NULL,
@prmzip NVARCHAR(10) = NULL,
@prmphn NVARCHAR(14) = NULL,
@prmeml NVARCHAR(75) = NULL
AS

  INSERT INTO StowellSandbox.dbo.actrec (_idnum
  , recnum
  , jobnme
  , shtnme
  , clnnum
  , contct
  , addrs1
  , addrs2
  , ctynme
  , state_
  , zipcde
  , phnnum
  , faxnum
  , achtct
  , lender
  , sprvsr
  , slsemp
  , estemp
  , usrdf1
  , usrdf2
  , lcltax
  , slstax
  , lgract
  , dptmnt
  , dscdte
  , duedte
  , dsccnt
  , finchg
  , retain
  , cntrct
  , begbal
  , endbal
  , biddte
  , plnrcv
  , actbid
  , ctcdte
  , prelen
  , sttdte
  , cmpdte
  , lenfld
  , lenrls
  , jobtyp
  , status
  , pstwip
  , crtfid
  , connum
  , pchord
  , imgfle
  , csttym
  , csttyl
  , csttye
  , csttys
  , csttyo
  , usrcs6
  , usrcs7
  , usrcs8
  , usrcs9
  , ntetxt
  , export
  , lotclr
  , lotprm
  , plnprc
  , actprc
  , estdte
  , actdte
  , lotnum
  , modnme
  , sqarft
  , usrlst
  , catxex
  , pstexm
  , insdte
  , insusr
  , upddte
  , updusr
  , inactv
  , fedsck
  , stmeml
  , ncrtck
  , rtejob
  , rtervw
  , county
  , fednum
  , stenum
  , awddte
  , strdte
  , dtecmp
  , pctcmp
  , typwrk
  , subcnt
  , prmnme
  , prmadd
  , prmcty
  , prmste
  , prmzip
  , prmphn
  , prmeml)
    VALUES (NEWID() -- _idnum - uniqueidentifier NOT NULL (was StowellSandbox.common.NewGuid())
    , @recnum -- recnum - bigint NOT NULL
    , @jobnme -- jobnme - nvarchar(75) NOT NULL
    , @shtnme -- shtnme - nvarchar(30) NOT NULL
    , COALESCE(@clnnum, NULL)-- clnnum - bigint
    , N'' -- contct - nvarchar(50) NOT NULL
    , COALESCE(@addrs1, N'') -- addrs1 - nvarchar(50) NOT NULL
    , COALESCE(@addrs2, N'') -- addrs2 - nvarchar(50) NOT NULL
    , COALESCE(@ctynme, N'') -- ctynme - nvarchar(50) NOT NULL
    , COALESCE(@state_, N'') -- state_ - nvarchar(2) NOT NULL
    , COALESCE(@zipcde, N'') -- zipcde - nvarchar(10) NOT NULL
    , N'' -- phnnum - nvarchar(14) NOT NULL
    , N'' -- faxnum - nvarchar(14) NOT NULL
    , NULL -- achtct - bigint
    , NULL -- lender - bigint
    , NULL -- sprvsr - bigint
    , NULL -- slsemp - bigint
    , NULL -- estemp - bigint
    , N'' -- usrdf1 - nvarchar(50) NOT NULL
    , N'' -- usrdf2 - nvarchar(50) NOT NULL
    , NULL -- lcltax - int
    , NULL -- slstax - int
    , NULL-- lgract - bigint
    , NULL -- dptmnt - bigint
    , COALESCE(@dscdte, N'') -- dscdte - nvarchar(6) NOT NULL
    , N'' -- duedte - nvarchar(6) NOT NULL
    , COALESCE(@dsccnt, 0) -- dsccnt - decimal(5, 2) NOT NULL
    , COALESCE(@finchg, 0) -- FIX (2026-09-23) - was hardcoded 0, ignoring @finchg entirely
    -- finchg - decimal(5, 2) NOT NULL
    , COALESCE(@retain, 0) -- FIX (2026-09-23) - was hardcoded 0, ignoring @retain entirely
    -- retain - decimal(5, 2) NOT NULL
    , COALESCE(@cntrct, 0) -- FIX (2026-09-23) - was hardcoded 0, ignoring @cntrct entirely
    -- cntrct - decimal(14, 2) NOT NULL
    , 0 -- begbal - decimal(14, 2) NOT NULL
    , 0 -- endbal - decimal(14, 2) NOT NULL
    , NULL -- biddte - date
    , NULL -- plnrcv - date
    , NULL -- actbid - date
    , NULL -- ctcdte - date
    , NULL -- prelen - date
    , NULL -- sttdte - date
    , NULL -- cmpdte - date
    , NULL -- lenfld - date
    , NULL -- lenrls - date
    , COALESCE(@jobtyp, NULL) -- jobtyp - smallint
    , 4 -- status - tinyint NOT NULL (4 = "Current", confirmed against dbo.VwJobStatus)
    , 0 -- pstwip - tinyint NOT NULL
    , 0 -- crtfid - tinyint NOT NULL
    , N'' -- connum - nvarchar(30) NOT NULL
    , N'' -- pchord - nvarchar(30) NOT NULL
    , N'' -- imgfle - nvarchar(max) NOT NULL
    , N'' -- csttym - nvarchar(1) NOT NULL
    , N'' -- csttyl - nvarchar(1) NOT NULL
    , N'' -- csttye - nvarchar(1) NOT NULL
    , N'' -- csttys - nvarchar(1) NOT NULL
    , N'' -- csttyo - nvarchar(1) NOT NULL
    , N'' -- usrcs6 - nvarchar(1) NOT NULL
    , N'' -- usrcs7 - nvarchar(1) NOT NULL
    , N'' -- usrcs8 - nvarchar(1) NOT NULL
    , N'' -- usrcs9 - nvarchar(1) NOT NULL
    , N'' -- ntetxt - nvarchar(max) NOT NULL
    , N'' -- export - nvarchar(max) NOT NULL
    , N'' -- lotclr - nvarchar(30) NOT NULL
    , 0 -- lotprm - decimal(12, 2) NOT NULL
    , 0 -- plnprc - decimal(12, 2) NOT NULL
    , 0 -- actprc - decimal(12, 2) NOT NULL
    , NULL -- estdte - date
    , NULL -- actdte - date
    , N'' -- lotnum - nvarchar(10) NOT NULL
    , N'' -- modnme - nvarchar(30) NOT NULL
    , 0 -- sqarft - bigint NOT NULL
    , N'' -- usrlst - nvarchar(1000) NOT NULL
    , 0 -- catxex - tinyint NOT NULL
    , 0 -- pstexm - tinyint NOT NULL
    , CONVERT(VARCHAR, GETDATE(), 21) -- insdte - datetime
    , N'shorgeshimer' -- insusr - sysname
    , CONVERT(VARCHAR, GETDATE(), 21) -- upddte - datetime
    , N'shorgeshimer' -- updusr - sysname
    , 0 -- inactv - tinyint NOT NULL
    , 0 -- fedsck - tinyint NOT NULL
    , N'' -- stmeml - nvarchar(75) NOT NULL
    , 0 -- ncrtck - tinyint NOT NULL
    , 0 -- rtejob - tinyint NOT NULL
    , NULL -- rtervw - bigint
    , N'' -- county - nvarchar(50) NOT NULL
    , N'' -- fednum - nvarchar(25) NOT NULL
    , N'' -- stenum - nvarchar(25) NOT NULL
    , NULL -- awddte - date
    , NULL -- strdte - date
    , NULL -- dtecmp - date
    , 0 -- pctcmp - int NOT NULL
    , N'' -- typwrk - nvarchar(50) NOT NULL
    , 0 -- subcnt - tinyint NOT NULL
    , N'' -- prmnme - nvarchar(50) NOT NULL
    , N'' -- prmadd - nvarchar(50) NOT NULL
    , N'' -- prmcty - nvarchar(50) NOT NULL
    , N'' -- prmste - nvarchar(2) NOT NULL
    , N'' -- prmzip - nvarchar(10) NOT NULL
    , N'' -- prmphn - nvarchar(14) NOT NULL
    , N'' -- prmeml - nvarchar(75) NOT NULL
    );
GO


/* ---------------------------------------------------------------------------------------------
   SECTION 2  (source: sp-convert-bid-to-project-carry-over-2026-09-23.sql)
   --------------------------------------------------------------------------------------------- */
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

/* ---------------------------------------------------------------------------------------------
   SECTION 3  (source: sp-get-next-display-bid-id-skip-existing-2026-09-23.sql)
   --------------------------------------------------------------------------------------------- */
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

/* ---------------------------------------------------------------------------------------------
   SECTION 4  (source: sp-cost-summary-subtract-open-pos-2026-09-23.sql)
   --------------------------------------------------------------------------------------------- */
-- 2026-09-23 - Mike Smith: open POs weren't reducing a cost code's Remaining in the Current Cost
-- Summary (Reporting tab / cost summary report). Changes vs the live procedure: (1) #temp.cstcde widened varchar(10) -> varchar(20)
-- (a cost code like 12162422.100 is 12 chars; jobs numbered 8 digits failed with 'Arithmetic overflow error converting numeric to data
-- type varchar' - 09-24 hotfix), and (2) Remaining now
-- also subtracts open PO commitments, and a Committed column is returned.
USE SageSBQ;
GO
ALTER PROCEDURE [dbo].[SPCostSummary]
(
@JobNumber varchar(10) =NULL,
@costcode varchar(MAX) =NULL,
@startphase int= NULL,
@endphase int=null,
  @StartDate VARCHAR(10) = NULL,
    @EndDate VARCHAR(10) = NULL


)
AS 

Declare @str varchar(Max)


DECLARE @recnum int = @JobNumber


DECLARE @thismonth INT, @thisyear INT, @month int, @year int
SELECT @month = month(getdate())
SELECT @year = year(getdate())

SELECT @thismonth = CASE WHEN @month = 1 THEN 12 ELSE @month -1 END
SELECT @thisyear =  CASE WHEN @month = 1 THEN @year -1  ELSE @year END
 
drop table if exists #results
select item as costcode into #costcode
from dbo.StringSplit(@costcode,',')

 
drop TABLE if EXISTS #temp
create TABLE  #temp (recnum int,cstcde varchar(20), costcodedescription varchar(100), budget decimal(38,2), changes decimal(18,2) , balance decimal(38,2))

INSERT INTO #temp (cstcde, recnum)
select DISTINCT cstcde, recnum 
FROM [StowellSandbox].dbo.bdglin Where (bdglin.recnum = @recnum)
union ALL
select DISTINCT cstcde, sbcgln.recnum
 from [StowellSandbox].dbo.sbcgln left outer join [StowellSandbox].dbo.prmchg on prmchg.recnum = sbcgln.recnum
Where (prmchg.jobnum = @recnum )
  union ALL
   Select jobcst.cstcde , jobnum
from [StowellSandbox].dbo.jobcst 
Where (status = 1)  AND (jobcst.jobnum  = @recnum) 
 

UPDATE t
SET t.budget = ISNULL(b.sum_ttlbdg, 0)
FROM #temp t
INNER JOIN (
    SELECT cstcde, SUM(ttlbdg) AS sum_ttlbdg
    FROM [StowellSandbox].dbo.bdglin
    WHERE recnum = @recnum AND cast(left(ltrim(rtrim(cstcde)),2) AS char(2)) IN ('10','11')
       AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum <= @endphase)
    GROUP BY cstcde
) b ON t.cstcde = b.cstcde;

 
UPDATE t
SET t.budget = ISNULL(b.eqpbdg, 0)
FROM #temp t
INNER JOIN (
    SELECT cstcde, SUM(ttlbdg) AS eqpbdg
    FROM [StowellSandbox].dbo.bdglin
    WHERE recnum = @recnum AND cast(left(ltrim(rtrim(cstcde)),2) AS char(2)) IN ('12')
       AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum <= @endphase)
    GROUP BY cstcde
) b ON t.cstcde = b.cstcde;


UPDATE t
SET t.budget = ISNULL(b.ttlbdg, 0)
FROM #temp t
INNER JOIN (
    SELECT cstcde, SUM(ttlbdg) AS ttlbdg
    FROM [StowellSandbox].dbo.bdglin
    WHERE recnum = @recnum AND cast(left(ltrim(rtrim(cstcde)),2) AS char(2)) IN ('20', '30', '31', '32', '33', '34','35','36','37', '38', '39' )
       AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum <= @endphase)
    GROUP BY cstcde
) b ON t.cstcde = b.cstcde;


UPDATE t
SET t.budget = ISNULL(b.subbdg, 0)
FROM #temp t
INNER JOIN (
    SELECT cstcde, SUM(subbdg) AS subbdg
    FROM [StowellSandbox].dbo.bdglin
    WHERE recnum = @recnum AND cast(left(ltrim(rtrim(cstcde)),2) AS char(2)) IN ('40','41', '42', '43', '44','45','46','47', '48', '49')
       AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum <= @endphase)
    GROUP BY cstcde
) b ON t.cstcde = b.cstcde;

 

UPDATE t
SET t.changes = ISNULL(b.bdgprc, 0)
FROM #temp t
INNER JOIN (
   SELECT sbcgln.cstcde,sum(sbcgln.bdgprc)  AS bdgprc from [StowellSandbox].dbo.sbcgln left outer join [StowellSandbox].dbo.prmchg on prmchg.recnum = sbcgln.recnum
Where (prmchg.jobnum = @recnum )   AND isnull(status,0) <> 5
   AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.prmchg.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.prmchg.phsnum <= @endphase)
group BY cstcde

) b ON t.cstcde = b.cstcde;

 
 
 
 

UPDATE t
SET t.costcodedescription = c.cdenme
FROM #temp t
LEFT OUTER JOIN SageSPB.dbo.vwbdglin v ON t.cstcde = v.cstcde AND v.recnum = @recnum
LEFT OUTER JOIN [StowellSandbox].dbo.cstcde c ON c.recnum = v.cstcde
WHERE v.recnum = @recnum;


--update t
-- SET t.costcodedescription = j.dscrpt
-- from #temp t inner join [StowellSandbox].dbo.jobcst j ON j.cstcde = t.cstcde and j.recnum = t.recnum
-- where j.recnum = t.recnum and t.costcodedescription is  null and j.dscrpt is not null and (j.status = 1)

  update  t
 set t.costcodedescription = c.cdenme
 from #temp t
 LEFT outer JOIN StowellSandbox.dbo.cstcde c  ON  t.cstcde = c.recnum
 WHERE t.costcodedescription IS NULL;

 --update  t
 --set t.costcodedescription = j.dscrpt
 --from #temp t
 --left  join VWJobcstdescrpt j on t.recnum = j.jobnum and t.cstcde = j.cstcde
 --WHERE t.costcodedescription IS NULL;


--update t
-- SET t.costcodedescription = j.dscrpt
-- from #temp t inner join [StowellSandbox].dbo.jobcst j ON j.cstcde = t.cstcde and j.jobnum = t.recnum
-- where j.cstcde = t.cstcde and  t.costcodedescription is  null and j.dscrpt is not null and (j.status = 1)
 


SELECT DISTINCT @recnum AS recnum, t.cstcde AS  CostCode, t.costcodedescription AS CostCodeDescription, 
 isnull(t.budget,0) + isnull(changes,0) AS Budget_Charges,
isnull(todate.todate,0) -isnull(currentmonth.currentmonth,0) AS ToDate,  thisperiod.thisperiod AS ThisPeriod, 
 --todate.todate AS ToDate, currentmonth.currentmonth,  isnull(todate.todate,0) -isnull(currentmonth.currentmonth,0) as correctvalue,  thisperiod.thisperiod AS ThisPeriod, 
 ((isnull(t.budget,0) + isnull(changes,0) )- (isnull(todate.todate,0) -isnull(currentmonth.currentmonth,0)) - isnull(committed.committed,0) ) AS Remaining,
 isnull(committed.committed,0) AS Committed 
  into #results 
 FROM #temp t
 left outer join
 (
   Select jobcst.cstcde, jobnum as recnum, sum(jobcst.cstamt) as todate--  ,jobcst.actprd,jobcst.postyr 
from [StowellSandbox].dbo.jobcst 
Where (status = 1)  AND (jobcst.jobnum  = @recnum)
AND    (ISNULL(@StartDate, '0') = '0' OR convert(date,jobcst.trndte) >= convert(date,@StartDate))
 AND    (ISNULL(@EndDate, '0') = '0' OR convert(date,jobcst.trndte) <= convert(date,@EndDate))
 AND
   (ISNULL(@startphase, 0) = 0 OR jobcst.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR jobcst.phsnum <= @endphase)
 --and postyr <= @thisyear and actprd <= @thismonth
 --and (postyr <> @thisyear and actprd <> @thismonth)
group by cstcde,jobnum
)as todate on todate.cstcde = t.cstcde 
 left outer join
 (
   Select jobcst.cstcde, jobnum as recnum, sum(jobcst.cstamt) as thisperiod--  ,jobcst.actprd,jobcst.postyr 
from [StowellSandbox].dbo.jobcst 
Where (status = 1)  AND (jobcst.jobnum  = @recnum)  
 AND 
 
   (ISNULL(@startphase, 0) = 0 OR jobcst.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR jobcst.phsnum <= @endphase)
 
and postyr = @thisyear and actprd = @thismonth
group by cstcde,jobnum
  --Order By jobcst.cstcde
) as thisperiod on thisperiod.cstcde = t.cstcde  
 

 left outer join
 (
   Select jobcst.cstcde, jobnum as recnum, sum(jobcst.cstamt) as currentmonth--  ,jobcst.actprd,jobcst.postyr 
from [StowellSandbox].dbo.jobcst 
Where (status = 1)  AND (jobcst.jobnum  = @recnum)  
 AND 
 
   (ISNULL(@startphase, 0) = 0 OR jobcst.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR jobcst.phsnum <= @endphase)
 
and postyr = @year and actprd = @month
group by cstcde,jobnum
  --Order By jobcst.cstcde
) as currentmonth on currentmonth.cstcde = t.cstcde  

  -- NEW (2026-09-23, Mike Smith - "PO does not appear to be subtracting PO items from cost code budget"):
 -- open Sage POs (pchord.status = 1) are commitments against the cost code, so they reduce Remaining
 -- (same rule PO_GetJobCostCodes already uses for the New PO form). pcorln has no phase column, so
 -- commitments can't be attributed to a single phase - only applied when no phase filter is set.
 left outer join
 (
   Select l.cstcde, sum(isnull(l.extttl,0)) as committed
   from [StowellSandbox].dbo.pcorln l
   join [StowellSandbox].dbo.pchord h on h.recnum = l.recnum
   Where h.jobnum = @recnum and isnull(h.status,0) = 1 and l.cstcde is not null
     AND ISNULL(@startphase,0) = 0 AND ISNULL(@endphase,0) = 0
   group by l.cstcde
 ) as committed on committed.cstcde = t.cstcde
declare @rc int 
select @rc =  count(1) from #costcode  
if (isnull(@rc,0) > 0)
 select * from #results r
 inner join #costcode c on r.CostCode = c.costcode
 else
  select * from #results
GO



/* ---------------------------------------------------------------------------------------------
   SECTION 5  (source: sp-po-get-job-phases-include-app-phases-2026-09-23.sql)
   --------------------------------------------------------------------------------------------- */
-- 2026-09-23 - Mike Smith (Change Order Budget Allocation): "I have phase 0-None selected which is the
-- only one that showed up". PO_GetJobPhases only read Sage's jobphs, but phases added in the app
-- ("Additional Phases" on the project -> dbo.BidPhase) never reach jobphs, so a project's second
-- phase never appeared in the Phase dropdown. Now app-added phases are included too (skipping any
-- phase number Sage already has for the job). Everything else is unchanged from the live procedure.
USE SageSBQ;
GO
ALTER PROCEDURE dbo.PO_GetJobPhases
    @JobId bigint
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM StowellSandbox.dbo.jobphs WHERE recnum = @JobId)
       OR EXISTS (SELECT 1 FROM dbo.BidPhase WHERE JobID = CONVERT(varchar(50), @JobId) AND COALESCE(IsDeleted, 0) = 0)
    BEGIN
        ;WITH p AS (
            SELECT phsnum, phsnme,
                   ROW_NUMBER() OVER (
                       PARTITION BY phsnum
                       ORDER BY CASE WHEN phsnme IS NULL OR LTRIM(RTRIM(phsnme)) IN ('', 'None') THEN 1 ELSE 0 END, insdte) AS rn
            FROM StowellSandbox.dbo.jobphs
            WHERE recnum = @JobId
        ),
        sage AS (
            SELECT phsnum AS PhaseNumber, phsnme AS PhaseName FROM p WHERE rn = 1
        ),
        app AS (
            SELECT TRY_CONVERT(int, b.Phase) AS PhaseNumber, b.Description AS PhaseName
            FROM dbo.BidPhase b
            WHERE b.JobID = CONVERT(varchar(50), @JobId)
              AND COALESCE(b.IsDeleted, 0) = 0
              AND TRY_CONVERT(int, b.Phase) IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM sage s WHERE s.PhaseNumber = TRY_CONVERT(int, b.Phase))
        )
        SELECT PhaseNumber, PhaseName FROM sage
        UNION ALL
        SELECT PhaseNumber, PhaseName FROM app
        ORDER BY PhaseNumber;
    END
    ELSE
    BEGIN
        SELECT CONVERT(int, phsnum) AS PhaseNumber, phsnme AS PhaseName
        FROM dbo.VWPhasesList
        ORDER BY phsnum;
    END
END
GO

/* ---------------------------------------------------------------------------------------------
   SECTION 6  (source: sp-po-get-job-overview-add-po-phase-2026-09-23.sql)
   --------------------------------------------------------------------------------------------- */
-- 2026-09-23 - Mike Smith / Moqups (TAB-Purchase Orders: 'Show only Active/Archived/Drafts for this project and Phase').
-- Adds each PO's Sage phase (pchord.phsnum) as PoPhase to the PO list (1st result set), on top of the CoPhase
-- added to the CO log earlier today, so the PO tab can filter by phase. No other change.
USE SageSBQ;
GO
ALTER PROCEDURE dbo.PO_GetJobOverview
    @JobId bigint
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.ordnum AS PoId,
        p.dscrpt AS PoDescription,
        CASE p.status WHEN 1 THEN 'Open' WHEN 4 THEN 'Closed' ELSE CONVERT(varchar(10), p.status) END AS Status,
        CONVERT(varchar(10), p.entdte, 101) AS DateSubmitted,
        CONVERT(varchar(10), p.schdte, 101) AS RequiredOnsite,
        ISNULL(v.vndnme, CONVERT(varchar(20), p.vndnum)) AS Vendor,
        p.phsnum AS PoPhase
    FROM StowellSandbox.dbo.pchord p
    LEFT JOIN StowellSandbox.dbo.actpay v ON v.recnum = p.vndnum
    WHERE p.jobnum = @JobId
    ORDER BY p.recnum DESC;

    SELECT
        c.chgnum AS CoId,
        c.dscrpt AS CoDescription,
        c.appamt AS CoAmount,
        CASE c.status WHEN 1 THEN 'Open' WHEN 4 THEN 'Closed' ELSE CONVERT(varchar(10), c.status) END AS CoStatus,
        c.reason AS CoReason,
        c.phsnum AS CoPhase
    FROM StowellSandbox.dbo.prmchg c
    WHERE c.jobnum = @JobId
    ORDER BY c.recnum DESC;

    SELECT
        CONVERT(varchar(20), bc.ID) AS BcId,
        bc.Vendor + ' - ' + bc.Reason AS BcDescription,
        bc.DollarCharge AS BcAmount,
        'Logged' AS BcStatus,
        bc.Reason AS BcReason
    FROM dbo.BackCharges bc
    WHERE bc.JobID = CONVERT(varchar(20), @JobId)
    ORDER BY bc.ID DESC;
END
GO


/* ---------------------------------------------------------------------------------------------
   SECTION 7  (source: po-phase-support-2026-09-23.sql)
   --------------------------------------------------------------------------------------------- */
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


/* ---------------------------------------------------------------------------------------------
   SECTION 8  (source: sp-co-submit-set-sage-co-status-2026-09-23.sql)
   --------------------------------------------------------------------------------------------- */
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


/* ---------------------------------------------------------------------------------------------
   SECTION 9  (source: sp-invoices-get-job-invoices-2026-09-23.sql)
   --------------------------------------------------------------------------------------------- */
-- 2026-09-23 - Invoices tab (Project Overview) had no backend at all: the Angular tab called
-- api/Invoices/GetJobInvoices/{jobId}, which returned 404, so the grid was always empty. This adds the
-- read it needs - the job's Sage invoices (accounts receivable, StowellSandbox.dbo.acrinv), each with its
-- Sage phase (acrinv.phsnum) so the tab can show all phases together or one phase at a time
-- (Mike Smith / Moqups TAB-Invoices: "Show only ... for this project and Phase").
--   Status: Sage acrinv.status 1 = Open (unpaid balance), 4 = Paid (zero balance), anything else (5) is
--   not a billed invoice (see reference notes: billed = status IN (1,4)), shown as "Not billed".
USE SageSBQ;
GO
CREATE OR ALTER PROCEDURE dbo.Invoices_GetJobInvoices
    @JobId bigint
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.invnum AS InvoiceId,
        i.dscrpt AS Name,
        i.invttl AS Amount,
        CASE i.status WHEN 1 THEN 'Open' WHEN 4 THEN 'Paid' ELSE 'Not billed' END AS Status,
        CAST(i.phsnum AS int) AS Phase,
        i.invdte AS InvoiceDate
    FROM StowellSandbox.dbo.acrinv i
    WHERE i.jobnum = @JobId
    ORDER BY i.invdte DESC, i.recnum DESC;
END
GO

/* ---------------------------------------------------------------------------------------------
   SECTION 10  (source: api-call-log-2026-09-24.sql)
   --------------------------------------------------------------------------------------------- */
/* =============================================================================================
   2026-09-24 - API call + error log (requested: "create a table and capture all errors with username and time;
   the table should capture all the api calls too, from all users").

   dbo.ApiCallLog     - ONE row per API call (every user), written in the background by the API
                        (StowellCoAPI ApiCallLoggingMiddleware), plus errors reported by the browser app.
                        IsError = 1 for any failed call (HTTP >= 400, an unhandled exception, or a browser-side error);
                        ErrorMessage / Details then hold the reason (the API's own message/details, or the stack trace).
   dbo.vw_ApiErrors   - just the failures (IsError = 1), newest first - the view to open when something is reported.
   dbo.ApiCallLog_Purge(@KeepDays) - housekeeping; the log grows with every call, so run it on a schedule
                        (e.g. a nightly SQL Agent job: EXEC dbo.ApiCallLog_Purge @KeepDays = 90).

   UserName comes from the X-User-Email header the Angular app now sends on every API call (the signed-in user), falling
   back to the email/upn claim of the bearer token, else 'anonymous'. NOTE: the API itself does not authenticate callers, so
   treat UserName as an audit label, not proof of identity. Request bodies are NOT stored (they hold business data).

   Safe to re-run.
   ============================================================================================= */
USE SageSBQ;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;   -- required for the filtered index below (sqlcmd defaults this OFF)
GO
IF OBJECT_ID('dbo.ApiCallLog', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ApiCallLog
    (
        Id            bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_ApiCallLog PRIMARY KEY CLUSTERED,
        LoggedAt      datetime2(3)  NOT NULL CONSTRAINT DF_ApiCallLog_LoggedAt    DEFAULT (SYSDATETIME()),     -- server local time
        LoggedAtUtc   datetime2(3)  NOT NULL CONSTRAINT DF_ApiCallLog_LoggedAtUtc DEFAULT (SYSUTCDATETIME()),
        UserName      nvarchar(256) NULL,          -- who (see header note)
        Source        varchar(10)   NOT NULL CONSTRAINT DF_ApiCallLog_Source DEFAULT ('API'),   -- 'API' or 'Client' (browser-reported)
        HttpMethod    varchar(10)   NULL,
        RequestPath   nvarchar(500) NULL,
        QueryString   nvarchar(1000) NULL,
        StatusCode    int           NULL,          -- HTTP status returned (500 for an unhandled exception; NULL for a browser error with no response)
        DurationMs    int           NULL,          -- API time to answer
        IsError       bit           NOT NULL CONSTRAINT DF_ApiCallLog_IsError DEFAULT (0),
        ErrorType     nvarchar(200) NULL,          -- exception type / 'HttpError' / 'ClientError'
        ErrorMessage  nvarchar(4000) NULL,         -- the reason
        Details       nvarchar(max) NULL,          -- stack trace, or the start of the error response body
        ClientIp      varchar(64)   NULL,
        UserAgent     nvarchar(400) NULL,
        TraceId       varchar(64)   NULL
    );
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ApiCallLog_LoggedAt' AND object_id = OBJECT_ID('dbo.ApiCallLog'))
    CREATE INDEX IX_ApiCallLog_LoggedAt ON dbo.ApiCallLog (LoggedAt DESC) INCLUDE (UserName, StatusCode, IsError);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ApiCallLog_User' AND object_id = OBJECT_ID('dbo.ApiCallLog'))
    CREATE INDEX IX_ApiCallLog_User ON dbo.ApiCallLog (UserName, LoggedAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ApiCallLog_Errors' AND object_id = OBJECT_ID('dbo.ApiCallLog'))
    CREATE INDEX IX_ApiCallLog_Errors ON dbo.ApiCallLog (LoggedAt DESC) WHERE IsError = 1;
GO
CREATE OR ALTER VIEW dbo.vw_ApiErrors
AS
    SELECT Id, LoggedAt, UserName, Source, HttpMethod, RequestPath, QueryString, StatusCode, DurationMs,
           ErrorType, ErrorMessage, Details, ClientIp, UserAgent, TraceId
    FROM dbo.ApiCallLog
    WHERE IsError = 1;
GO
CREATE OR ALTER PROCEDURE dbo.ApiCallLog_Purge
    @KeepDays int = 90
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @cut datetime2(3) = DATEADD(DAY, -ABS(@KeepDays), SYSDATETIME());
    DECLARE @n int = 1, @total int = 0;
    WHILE @n > 0            -- in batches so a big purge doesn't lock the table
    BEGIN
        DELETE TOP (20000) FROM dbo.ApiCallLog WHERE LoggedAt < @cut;
        SET @n = @@ROWCOUNT;
        SET @total += @n;
    END
    SELECT @total AS RowsDeleted;
END
GO


/* ============================================================================
   SECTION 11 - Change Order allocation no longer double-counts the budget (2026-09-24)
   ============================================================================ */
GO
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


/* ============================================================================
   SECTION 12 - SPCostSummary: "0 - None" means phase 0 only (2026-09-24). Replaces the SPCostSummary of section 4.
   ============================================================================ */
GO
/* ----------------------------------------------------------------------------
   2026-09-24  SPCostSummary: "0 - None" now means phase 0 only.
   Phase 0 used to mean "no phase filter" (0 is the default), so picking "0 - None" in the Phase dropdown
   showed the whole job. New optional parameter @exactphase: when given (including 0) only that phase is
   summed; when NULL (the default - every existing caller) nothing changes. Open PO commitments are still
   not attributed to a phase, so they are 0 in any phase view (unchanged rule).
   ---------------------------------------------------------------------------- */
ALTER PROCEDURE [dbo].[SPCostSummary]
(
@JobNumber varchar(10) =NULL,
@costcode varchar(MAX) =NULL,
@startphase int= NULL,
@endphase int=null,
  @StartDate VARCHAR(10) = NULL,
    @EndDate VARCHAR(10) = NULL,
    @exactphase int = NULL   -- NEW 2026-09-24: when set (even 0), only that phase; NULL keeps the old start/end behavior


)
AS 

Declare @str varchar(Max)


DECLARE @recnum int = @JobNumber


DECLARE @thismonth INT, @thisyear INT, @month int, @year int
SELECT @month = month(getdate())
SELECT @year = year(getdate())

SELECT @thismonth = CASE WHEN @month = 1 THEN 12 ELSE @month -1 END
SELECT @thisyear =  CASE WHEN @month = 1 THEN @year -1  ELSE @year END
 
drop table if exists #results
select item as costcode into #costcode
from dbo.StringSplit(@costcode,',')

 
drop TABLE if EXISTS #temp
create TABLE  #temp (recnum int,cstcde varchar(20), costcodedescription varchar(100), budget decimal(38,2), changes decimal(18,2) , balance decimal(38,2))

INSERT INTO #temp (cstcde, recnum)
select DISTINCT cstcde, recnum 
FROM [StowellSandbox].dbo.bdglin Where (bdglin.recnum = @recnum)
union ALL
select DISTINCT cstcde, sbcgln.recnum
 from [StowellSandbox].dbo.sbcgln left outer join [StowellSandbox].dbo.prmchg on prmchg.recnum = sbcgln.recnum
Where (prmchg.jobnum = @recnum )
  union ALL
   Select jobcst.cstcde , jobnum
from [StowellSandbox].dbo.jobcst 
Where (status = 1)  AND (jobcst.jobnum  = @recnum) 
 

UPDATE t
SET t.budget = ISNULL(b.sum_ttlbdg, 0)
FROM #temp t
INNER JOIN (
    SELECT cstcde, SUM(ttlbdg) AS sum_ttlbdg
    FROM [StowellSandbox].dbo.bdglin
    WHERE recnum = @recnum AND cast(left(ltrim(rtrim(cstcde)),2) AS char(2)) IN ('10','11')
       AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum <= @endphase)
      AND (@exactphase IS NULL OR StowellSandbox.dbo.bdglin.phsnum = @exactphase)
    GROUP BY cstcde
) b ON t.cstcde = b.cstcde;

 
UPDATE t
SET t.budget = ISNULL(b.eqpbdg, 0)
FROM #temp t
INNER JOIN (
    SELECT cstcde, SUM(ttlbdg) AS eqpbdg
    FROM [StowellSandbox].dbo.bdglin
    WHERE recnum = @recnum AND cast(left(ltrim(rtrim(cstcde)),2) AS char(2)) IN ('12')
       AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum <= @endphase)
      AND (@exactphase IS NULL OR StowellSandbox.dbo.bdglin.phsnum = @exactphase)
    GROUP BY cstcde
) b ON t.cstcde = b.cstcde;


UPDATE t
SET t.budget = ISNULL(b.ttlbdg, 0)
FROM #temp t
INNER JOIN (
    SELECT cstcde, SUM(ttlbdg) AS ttlbdg
    FROM [StowellSandbox].dbo.bdglin
    WHERE recnum = @recnum AND cast(left(ltrim(rtrim(cstcde)),2) AS char(2)) IN ('20', '30', '31', '32', '33', '34','35','36','37', '38', '39' )
       AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum <= @endphase)
      AND (@exactphase IS NULL OR StowellSandbox.dbo.bdglin.phsnum = @exactphase)
    GROUP BY cstcde
) b ON t.cstcde = b.cstcde;


UPDATE t
SET t.budget = ISNULL(b.subbdg, 0)
FROM #temp t
INNER JOIN (
    SELECT cstcde, SUM(subbdg) AS subbdg
    FROM [StowellSandbox].dbo.bdglin
    WHERE recnum = @recnum AND cast(left(ltrim(rtrim(cstcde)),2) AS char(2)) IN ('40','41', '42', '43', '44','45','46','47', '48', '49')
       AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum <= @endphase)
      AND (@exactphase IS NULL OR StowellSandbox.dbo.bdglin.phsnum = @exactphase)
    GROUP BY cstcde
) b ON t.cstcde = b.cstcde;

 

UPDATE t
SET t.changes = ISNULL(b.bdgprc, 0)
FROM #temp t
INNER JOIN (
   SELECT sbcgln.cstcde,sum(sbcgln.bdgprc)  AS bdgprc from [StowellSandbox].dbo.sbcgln left outer join [StowellSandbox].dbo.prmchg on prmchg.recnum = sbcgln.recnum
Where (prmchg.jobnum = @recnum )   AND isnull(status,0) <> 5
   AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.prmchg.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.prmchg.phsnum <= @endphase)
      AND (@exactphase IS NULL OR ISNULL(StowellSandbox.dbo.prmchg.phsnum, 0) = @exactphase)
group BY cstcde

) b ON t.cstcde = b.cstcde;

 
 
 
 

UPDATE t
SET t.costcodedescription = c.cdenme
FROM #temp t
LEFT OUTER JOIN SageSPB.dbo.vwbdglin v ON t.cstcde = v.cstcde AND v.recnum = @recnum
LEFT OUTER JOIN [StowellSandbox].dbo.cstcde c ON c.recnum = v.cstcde
WHERE v.recnum = @recnum;


--update t
-- SET t.costcodedescription = j.dscrpt
-- from #temp t inner join [StowellSandbox].dbo.jobcst j ON j.cstcde = t.cstcde and j.recnum = t.recnum
-- where j.recnum = t.recnum and t.costcodedescription is  null and j.dscrpt is not null and (j.status = 1)

  update  t
 set t.costcodedescription = c.cdenme
 from #temp t
 LEFT outer JOIN StowellSandbox.dbo.cstcde c  ON  t.cstcde = c.recnum
 WHERE t.costcodedescription IS NULL;

 --update  t
 --set t.costcodedescription = j.dscrpt
 --from #temp t
 --left  join VWJobcstdescrpt j on t.recnum = j.jobnum and t.cstcde = j.cstcde
 --WHERE t.costcodedescription IS NULL;


--update t
-- SET t.costcodedescription = j.dscrpt
-- from #temp t inner join [StowellSandbox].dbo.jobcst j ON j.cstcde = t.cstcde and j.jobnum = t.recnum
-- where j.cstcde = t.cstcde and  t.costcodedescription is  null and j.dscrpt is not null and (j.status = 1)
 


SELECT DISTINCT @recnum AS recnum, t.cstcde AS  CostCode, t.costcodedescription AS CostCodeDescription, 
 isnull(t.budget,0) + isnull(changes,0) AS Budget_Charges,
isnull(todate.todate,0) -isnull(currentmonth.currentmonth,0) AS ToDate,  thisperiod.thisperiod AS ThisPeriod, 
 --todate.todate AS ToDate, currentmonth.currentmonth,  isnull(todate.todate,0) -isnull(currentmonth.currentmonth,0) as correctvalue,  thisperiod.thisperiod AS ThisPeriod, 
 ((isnull(t.budget,0) + isnull(changes,0) )- (isnull(todate.todate,0) -isnull(currentmonth.currentmonth,0)) - isnull(committed.committed,0) ) AS Remaining,
 isnull(committed.committed,0) AS Committed 
  into #results 
 FROM #temp t
 left outer join
 (
   Select jobcst.cstcde, jobnum as recnum, sum(jobcst.cstamt) as todate--  ,jobcst.actprd,jobcst.postyr 
from [StowellSandbox].dbo.jobcst 
Where (status = 1)  AND (jobcst.jobnum  = @recnum)
AND    (ISNULL(@StartDate, '0') = '0' OR convert(date,jobcst.trndte) >= convert(date,@StartDate))
 AND    (ISNULL(@EndDate, '0') = '0' OR convert(date,jobcst.trndte) <= convert(date,@EndDate))
 AND
   (ISNULL(@startphase, 0) = 0 OR jobcst.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR jobcst.phsnum <= @endphase)
      AND (@exactphase IS NULL OR ISNULL(jobcst.phsnum, 0) = @exactphase)
 --and postyr <= @thisyear and actprd <= @thismonth
 --and (postyr <> @thisyear and actprd <> @thismonth)
group by cstcde,jobnum
)as todate on todate.cstcde = t.cstcde 
 left outer join
 (
   Select jobcst.cstcde, jobnum as recnum, sum(jobcst.cstamt) as thisperiod--  ,jobcst.actprd,jobcst.postyr 
from [StowellSandbox].dbo.jobcst 
Where (status = 1)  AND (jobcst.jobnum  = @recnum)  
 AND 
 
   (ISNULL(@startphase, 0) = 0 OR jobcst.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR jobcst.phsnum <= @endphase)
      AND (@exactphase IS NULL OR ISNULL(jobcst.phsnum, 0) = @exactphase)
 
and postyr = @thisyear and actprd = @thismonth
group by cstcde,jobnum
  --Order By jobcst.cstcde
) as thisperiod on thisperiod.cstcde = t.cstcde  
 

 left outer join
 (
   Select jobcst.cstcde, jobnum as recnum, sum(jobcst.cstamt) as currentmonth--  ,jobcst.actprd,jobcst.postyr 
from [StowellSandbox].dbo.jobcst 
Where (status = 1)  AND (jobcst.jobnum  = @recnum)  
 AND 
 
   (ISNULL(@startphase, 0) = 0 OR jobcst.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR jobcst.phsnum <= @endphase)
      AND (@exactphase IS NULL OR ISNULL(jobcst.phsnum, 0) = @exactphase)
 
and postyr = @year and actprd = @month
group by cstcde,jobnum
  --Order By jobcst.cstcde
) as currentmonth on currentmonth.cstcde = t.cstcde  

  -- NEW (2026-09-23, Mike Smith - "PO does not appear to be subtracting PO items from cost code budget"):
 -- open Sage POs (pchord.status = 1) are commitments against the cost code, so they reduce Remaining
 -- (same rule PO_GetJobCostCodes already uses for the New PO form). pcorln has no phase column, so
 -- commitments can't be attributed to a single phase - only applied when no phase filter is set.
 left outer join
 (
   Select l.cstcde, sum(isnull(l.extttl,0)) as committed
   from [StowellSandbox].dbo.pcorln l
   join [StowellSandbox].dbo.pchord h on h.recnum = l.recnum
   Where h.jobnum = @recnum and isnull(h.status,0) = 1 and l.cstcde is not null
     AND ISNULL(@startphase,0) = 0 AND ISNULL(@endphase,0) = 0 AND @exactphase IS NULL
   group by l.cstcde
 ) as committed on committed.cstcde = t.cstcde
declare @rc int 
select @rc =  count(1) from #costcode  
if (isnull(@rc,0) > 0)
 select * from #results r
 inner join #costcode c on r.CostCode = c.costcode
 else
  select * from #results

GO


/* ============================================================================
   SECTION 13 - PO commitments by phase + phases listed once + Bid Lost sets the status + PO cost-code data fix (2026-09-24).
   Replaces SPCostSummary of sections 4/12. Ends with a data fix: its SELECT lists the PO lines it fills in.
   ============================================================================ */
GO
/* ----------------------------------------------------------------------------
   2026-09-24  SPCostSummary: open PO commitments now count in phase views and on cost codes with no budget line.
   - A PO carries its own phase (pchord.phsnum, since PO phase support), so its commitment is now subtracted in that
     phase's view (it used to be 0 in every single-phase view).
   - Cost codes that have an open PO but no budget line are added to the list, so the commitment is never dropped.
   ---------------------------------------------------------------------------- */
ALTER PROCEDURE [dbo].[SPCostSummary]
(
@JobNumber varchar(10) =NULL,
@costcode varchar(MAX) =NULL,
@startphase int= NULL,
@endphase int=null,
  @StartDate VARCHAR(10) = NULL,
    @EndDate VARCHAR(10) = NULL,
    @exactphase int = NULL   -- NEW 2026-09-24: when set (even 0), only that phase; NULL keeps the old start/end behavior


)
AS 

Declare @str varchar(Max)


DECLARE @recnum int = @JobNumber


DECLARE @thismonth INT, @thisyear INT, @month int, @year int
SELECT @month = month(getdate())
SELECT @year = year(getdate())

SELECT @thismonth = CASE WHEN @month = 1 THEN 12 ELSE @month -1 END
SELECT @thisyear =  CASE WHEN @month = 1 THEN @year -1  ELSE @year END
 
drop table if exists #results
select item as costcode into #costcode
from dbo.StringSplit(@costcode,',')

 
drop TABLE if EXISTS #temp
create TABLE  #temp (recnum int,cstcde varchar(20), costcodedescription varchar(100), budget decimal(38,2), changes decimal(18,2) , balance decimal(38,2))

INSERT INTO #temp (cstcde, recnum)
select DISTINCT cstcde, recnum 
FROM [StowellSandbox].dbo.bdglin Where (bdglin.recnum = @recnum)
union ALL
select DISTINCT cstcde, sbcgln.recnum
 from [StowellSandbox].dbo.sbcgln left outer join [StowellSandbox].dbo.prmchg on prmchg.recnum = sbcgln.recnum
Where (prmchg.jobnum = @recnum )
  union ALL
   Select jobcst.cstcde , jobnum
from [StowellSandbox].dbo.jobcst 
Where (status = 1)  AND (jobcst.jobnum  = @recnum)
  union ALL
  -- NEW 2026-09-24: cost codes with an open PO (a commitment on a code with no budget line yet still counts)
  Select DISTINCT l.cstcde, h.jobnum
  from [StowellSandbox].dbo.pcorln l join [StowellSandbox].dbo.pchord h on h.recnum = l.recnum
  Where h.jobnum = @recnum and isnull(h.status,0) = 1 and l.cstcde is not null 
 

UPDATE t
SET t.budget = ISNULL(b.sum_ttlbdg, 0)
FROM #temp t
INNER JOIN (
    SELECT cstcde, SUM(ttlbdg) AS sum_ttlbdg
    FROM [StowellSandbox].dbo.bdglin
    WHERE recnum = @recnum AND cast(left(ltrim(rtrim(cstcde)),2) AS char(2)) IN ('10','11')
       AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum <= @endphase)
      AND (@exactphase IS NULL OR StowellSandbox.dbo.bdglin.phsnum = @exactphase)
    GROUP BY cstcde
) b ON t.cstcde = b.cstcde;

 
UPDATE t
SET t.budget = ISNULL(b.eqpbdg, 0)
FROM #temp t
INNER JOIN (
    SELECT cstcde, SUM(ttlbdg) AS eqpbdg
    FROM [StowellSandbox].dbo.bdglin
    WHERE recnum = @recnum AND cast(left(ltrim(rtrim(cstcde)),2) AS char(2)) IN ('12')
       AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum <= @endphase)
      AND (@exactphase IS NULL OR StowellSandbox.dbo.bdglin.phsnum = @exactphase)
    GROUP BY cstcde
) b ON t.cstcde = b.cstcde;


UPDATE t
SET t.budget = ISNULL(b.ttlbdg, 0)
FROM #temp t
INNER JOIN (
    SELECT cstcde, SUM(ttlbdg) AS ttlbdg
    FROM [StowellSandbox].dbo.bdglin
    WHERE recnum = @recnum AND cast(left(ltrim(rtrim(cstcde)),2) AS char(2)) IN ('20', '30', '31', '32', '33', '34','35','36','37', '38', '39' )
       AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum <= @endphase)
      AND (@exactphase IS NULL OR StowellSandbox.dbo.bdglin.phsnum = @exactphase)
    GROUP BY cstcde
) b ON t.cstcde = b.cstcde;


UPDATE t
SET t.budget = ISNULL(b.subbdg, 0)
FROM #temp t
INNER JOIN (
    SELECT cstcde, SUM(subbdg) AS subbdg
    FROM [StowellSandbox].dbo.bdglin
    WHERE recnum = @recnum AND cast(left(ltrim(rtrim(cstcde)),2) AS char(2)) IN ('40','41', '42', '43', '44','45','46','47', '48', '49')
       AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.bdglin.phsnum <= @endphase)
      AND (@exactphase IS NULL OR StowellSandbox.dbo.bdglin.phsnum = @exactphase)
    GROUP BY cstcde
) b ON t.cstcde = b.cstcde;

 

UPDATE t
SET t.changes = ISNULL(b.bdgprc, 0)
FROM #temp t
INNER JOIN (
   SELECT sbcgln.cstcde,sum(sbcgln.bdgprc)  AS bdgprc from [StowellSandbox].dbo.sbcgln left outer join [StowellSandbox].dbo.prmchg on prmchg.recnum = sbcgln.recnum
Where (prmchg.jobnum = @recnum )   AND isnull(status,0) <> 5
   AND 
 
   (ISNULL(@startphase, 0) = 0 OR StowellSandbox.dbo.prmchg.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR StowellSandbox.dbo.prmchg.phsnum <= @endphase)
      AND (@exactphase IS NULL OR ISNULL(StowellSandbox.dbo.prmchg.phsnum, 0) = @exactphase)
group BY cstcde

) b ON t.cstcde = b.cstcde;

 
 
 
 

UPDATE t
SET t.costcodedescription = c.cdenme
FROM #temp t
LEFT OUTER JOIN SageSPB.dbo.vwbdglin v ON t.cstcde = v.cstcde AND v.recnum = @recnum
LEFT OUTER JOIN [StowellSandbox].dbo.cstcde c ON c.recnum = v.cstcde
WHERE v.recnum = @recnum;


--update t
-- SET t.costcodedescription = j.dscrpt
-- from #temp t inner join [StowellSandbox].dbo.jobcst j ON j.cstcde = t.cstcde and j.recnum = t.recnum
-- where j.recnum = t.recnum and t.costcodedescription is  null and j.dscrpt is not null and (j.status = 1)

  update  t
 set t.costcodedescription = c.cdenme
 from #temp t
 LEFT outer JOIN StowellSandbox.dbo.cstcde c  ON  t.cstcde = c.recnum
 WHERE t.costcodedescription IS NULL;

 --update  t
 --set t.costcodedescription = j.dscrpt
 --from #temp t
 --left  join VWJobcstdescrpt j on t.recnum = j.jobnum and t.cstcde = j.cstcde
 --WHERE t.costcodedescription IS NULL;


--update t
-- SET t.costcodedescription = j.dscrpt
-- from #temp t inner join [StowellSandbox].dbo.jobcst j ON j.cstcde = t.cstcde and j.jobnum = t.recnum
-- where j.cstcde = t.cstcde and  t.costcodedescription is  null and j.dscrpt is not null and (j.status = 1)
 


SELECT DISTINCT @recnum AS recnum, t.cstcde AS  CostCode, t.costcodedescription AS CostCodeDescription, 
 isnull(t.budget,0) + isnull(changes,0) AS Budget_Charges,
isnull(todate.todate,0) -isnull(currentmonth.currentmonth,0) AS ToDate,  thisperiod.thisperiod AS ThisPeriod, 
 --todate.todate AS ToDate, currentmonth.currentmonth,  isnull(todate.todate,0) -isnull(currentmonth.currentmonth,0) as correctvalue,  thisperiod.thisperiod AS ThisPeriod, 
 ((isnull(t.budget,0) + isnull(changes,0) )- (isnull(todate.todate,0) -isnull(currentmonth.currentmonth,0)) - isnull(committed.committed,0) ) AS Remaining,
 isnull(committed.committed,0) AS Committed 
  into #results 
 FROM #temp t
 left outer join
 (
   Select jobcst.cstcde, jobnum as recnum, sum(jobcst.cstamt) as todate--  ,jobcst.actprd,jobcst.postyr 
from [StowellSandbox].dbo.jobcst 
Where (status = 1)  AND (jobcst.jobnum  = @recnum)
AND    (ISNULL(@StartDate, '0') = '0' OR convert(date,jobcst.trndte) >= convert(date,@StartDate))
 AND    (ISNULL(@EndDate, '0') = '0' OR convert(date,jobcst.trndte) <= convert(date,@EndDate))
 AND
   (ISNULL(@startphase, 0) = 0 OR jobcst.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR jobcst.phsnum <= @endphase)
      AND (@exactphase IS NULL OR ISNULL(jobcst.phsnum, 0) = @exactphase)
 --and postyr <= @thisyear and actprd <= @thismonth
 --and (postyr <> @thisyear and actprd <> @thismonth)
group by cstcde,jobnum
)as todate on todate.cstcde = t.cstcde 
 left outer join
 (
   Select jobcst.cstcde, jobnum as recnum, sum(jobcst.cstamt) as thisperiod--  ,jobcst.actprd,jobcst.postyr 
from [StowellSandbox].dbo.jobcst 
Where (status = 1)  AND (jobcst.jobnum  = @recnum)  
 AND 
 
   (ISNULL(@startphase, 0) = 0 OR jobcst.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR jobcst.phsnum <= @endphase)
      AND (@exactphase IS NULL OR ISNULL(jobcst.phsnum, 0) = @exactphase)
 
and postyr = @thisyear and actprd = @thismonth
group by cstcde,jobnum
  --Order By jobcst.cstcde
) as thisperiod on thisperiod.cstcde = t.cstcde  
 

 left outer join
 (
   Select jobcst.cstcde, jobnum as recnum, sum(jobcst.cstamt) as currentmonth--  ,jobcst.actprd,jobcst.postyr 
from [StowellSandbox].dbo.jobcst 
Where (status = 1)  AND (jobcst.jobnum  = @recnum)  
 AND 
 
   (ISNULL(@startphase, 0) = 0 OR jobcst.phsnum >= @startphase)
      AND 
 
   (ISNULL(@endphase, 0) = 0 OR jobcst.phsnum <= @endphase)
      AND (@exactphase IS NULL OR ISNULL(jobcst.phsnum, 0) = @exactphase)
 
and postyr = @year and actprd = @month
group by cstcde,jobnum
  --Order By jobcst.cstcde
) as currentmonth on currentmonth.cstcde = t.cstcde  

  -- NEW (2026-09-23, Mike Smith - "PO does not appear to be subtracting PO items from cost code budget"):
 -- open Sage POs (pchord.status = 1) are commitments against the cost code, so they reduce Remaining
 -- (same rule PO_GetJobCostCodes already uses for the New PO form). pcorln has no phase column, so
 -- commitments can't be attributed to a single phase - only applied when no phase filter is set.
 left outer join
 (
   Select l.cstcde, sum(isnull(l.extttl,0)) as committed
   from [StowellSandbox].dbo.pcorln l
   join [StowellSandbox].dbo.pchord h on h.recnum = l.recnum
   Where h.jobnum = @recnum and isnull(h.status,0) = 1 and l.cstcde is not null
     AND (ISNULL(@startphase,0) = 0 OR ISNULL(h.phsnum,0) >= @startphase) AND (ISNULL(@endphase,0) = 0 OR ISNULL(h.phsnum,0) <= @endphase) AND (@exactphase IS NULL OR ISNULL(h.phsnum,0) = @exactphase)
   group by l.cstcde
 ) as committed on committed.cstcde = t.cstcde
declare @rc int 
select @rc =  count(1) from #costcode  
if (isnull(@rc,0) > 0)
 select * from #results r
 inner join #costcode c on r.CostCode = c.costcode
 else
  select * from #results


GO

GO
/* ----------------------------------------------------------------------------
   2026-09-24  BidPhases_Select: each phase once. A phase that has a budget (bdglin) or was added in the app (BidPhase)
   was listed twice ("Duplicating Phase 1" on Initial Budget Configuration; "None" twice on other projects).
   Sage's phase name wins, then the app's, then the built-in "None".
   ---------------------------------------------------------------------------- */
ALTER PROCEDURE [dbo].[BidPhases_Select] @JobID VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        ;WITH AllPhases AS (
            SELECT DISTINCT bdglin.recnum AS JobID, CAST(vpl.phsnum AS varchar(20)) AS Phase, vpl.phsnme AS Description, 1 AS Pri
            FROM StowellSandbox.dbo.bdglin
                 INNER JOIN dbo.VWPhasesList vpl ON bdglin.phsnum = vpl.phsnum
            WHERE bdglin.recnum = @JobID
            UNION ALL
            SELECT bp.JobID, CAST(bp.Phase AS varchar(20)), bp.Description, 2
            FROM BidPhase bp
            WHERE bp.JobID = @JobID AND ISNULL(bp.IsDeleted, 0) = 0
            UNION ALL
            SELECT @JobID, '0', 'None', 3
        ), Ranked AS (
            SELECT JobID, Phase, Description,
                   ROW_NUMBER() OVER (PARTITION BY LTRIM(RTRIM(Phase)) ORDER BY Pri) AS rn
            FROM AllPhases
        )
        SELECT JobID, Phase, Description
        FROM Ranked
        WHERE rn = 1
        ORDER BY TRY_CONVERT(int, Phase), Phase;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) =
            N'Error in BidPhases_Select: ' + ERROR_MESSAGE() + N' | JobID: ' + ISNULL(@JobID, 'NULL');
        RAISERROR (@ErrorMessage, 16, 1);
        RETURN -1;
    END CATCH;
END;
GO

/* ----------------------------------------------------------------------------
   2026-09-24  sp_CloseBidAsLost: "When Lost button is clicked we need to change Status to Lost and move to Closed Bids
   Queue" (Mike Smith, bid B2600023). It only set IsBidLost = 1, so the bid's Status stayed as it was. It now also sets
   BidStatus = 'Lost' (the Current queue hides Lost bids, the Closed queue lists them as Closed/Lost).
   @ModifiedBy is optional. Everything else is unchanged.
   ---------------------------------------------------------------------------- */
ALTER PROCEDURE sp_CloseBidAsLost
    @InternalBidID INT,
    @ModifiedBy VARCHAR(100) = 'system'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IsProject BIT;
    DECLARE @IsBidLost BIT;

    BEGIN TRY
        INSERT INTO BidLog (ProcedureName, StepName, RelatedRecordID, LogMessage, PerformedBy)
        VALUES ('sp_CloseBidAsLost', 'Initialization', @InternalBidID, 'Started process to close bid as Lost.', @ModifiedBy);

        -- Check current state
        SELECT @IsProject = IsProject, @IsBidLost = IsBidLost
        FROM BidRecords
        WHERE InternalBidID = @InternalBidID;

        IF @IsProject IS NOT NULL
            BEGIN
                IF @IsProject = 1
                    BEGIN
                        INSERT INTO BidLog (ProcedureName, StepName, RelatedRecordID, LogMessage, PerformedBy)
                        VALUES ('sp_CloseBidAsLost', 'Validation Failed', @InternalBidID, 'Cannot mark as lost: Record is already an active project.', @ModifiedBy);
                        SELECT 'Failed: Record is already a project' AS Result;
                    END
                ELSE IF @IsBidLost = 1
                    BEGIN
                        SELECT 'Failed: Bid is already marked as lost' AS Result;
                    END
                ELSE
                    BEGIN
                        -- Update Record: flip IsBidLost and set the Status to Lost
                        UPDATE BidRecords
                        SET
                            IsBidLost = 1,
                            BidStatus = 'Lost',
                            ModifiedDate = GETDATE()
                        WHERE InternalBidID = @InternalBidID;

                        INSERT INTO BidLog (ProcedureName, StepName, RelatedRecordID, LogMessage, PerformedBy)
                        VALUES ('sp_CloseBidAsLost', 'Status Updated', @InternalBidID, 'Bid successfully marked as Lost (IsBidLost = 1, BidStatus = Lost).', @ModifiedBy);

                        SELECT 'Success' AS Result;
                    END
            END
        ELSE
            BEGIN
                SELECT 'Failed: Bid not found' AS Result;
            END

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage VARCHAR(4000) = ERROR_MESSAGE();
        INSERT INTO BidLog (ProcedureName, StepName, RelatedRecordID, LogMessage, PerformedBy)
        VALUES ('sp_CloseBidAsLost', 'ERROR', @InternalBidID, 'Update Failed. Error: ' + @ErrorMessage, @ModifiedBy);
        THROW;
    END CATCH
END;
GO

/* ----------------------------------------------------------------------------
   2026-09-24  DATA FIX - PO lines saved without a cost code (submitted before PO_SubmitRequest kept the cost code)
   never counted as a commitment ("PO did not subtract from Total Remaining"). The cost code is in the line text
   ("1100 - GC - Project Contingency", "12162423.3 - 3000 - M - General Materials"): it is filled in only where the line
   has none AND the text starts with a real cost code (1000 or more) that exists. Lines that already have a cost code are
   not touched. The SELECT below lists exactly what is about to change (PO, line, text, code).
   ---------------------------------------------------------------------------- */
SELECT h.ordnum AS PoId, h.jobnum AS JobId, h.status AS PoStatus, l.linnum AS Line, l.prtdsc AS LineText, x.code AS CostCodeToSet, l.extttl AS Amount
FROM StowellSandbox.dbo.pcorln l
JOIN StowellSandbox.dbo.pchord h ON h.recnum = l.recnum
CROSS APPLY (SELECT TRY_CONVERT(decimal(15,3), LEFT(l.prtdsc, CHARINDEX(' - ', l.prtdsc + ' - ') - 1)) AS code) x
WHERE l.cstcde IS NULL AND x.code >= 1000
  AND EXISTS (SELECT 1 FROM StowellSandbox.dbo.cstcde c WHERE c.recnum = x.code)
  AND h.entdte >= '2026-01-01'
ORDER BY h.jobnum, h.ordnum, l.linnum;
GO
UPDATE l
SET l.cstcde = x.code
FROM StowellSandbox.dbo.pcorln l
JOIN StowellSandbox.dbo.pchord h ON h.recnum = l.recnum
CROSS APPLY (SELECT TRY_CONVERT(decimal(15,3), LEFT(l.prtdsc, CHARINDEX(' - ', l.prtdsc + ' - ') - 1)) AS code) x
WHERE l.cstcde IS NULL AND x.code >= 1000
  AND EXISTS (SELECT 1 FROM StowellSandbox.dbo.cstcde c WHERE c.recnum = x.code)
  AND h.entdte >= '2026-01-01';
GO
