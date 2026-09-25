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

