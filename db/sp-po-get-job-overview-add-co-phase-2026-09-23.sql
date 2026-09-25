-- 2026-09-23 - Mike Smith: PO/CO/Invoices tabs need to show all phases together or one phase at a time.
-- The change order log now also returns each CO's Sage phase (prmchg.phsnum) as CoPhase so the CO tab can
-- filter by phase. Only change vs the live procedure: the extra CoPhase column in the 2nd result set.
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
        ISNULL(v.vndnme, CONVERT(varchar(20), p.vndnum)) AS Vendor
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

