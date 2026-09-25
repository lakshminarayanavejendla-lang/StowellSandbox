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
