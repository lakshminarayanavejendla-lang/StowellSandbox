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
