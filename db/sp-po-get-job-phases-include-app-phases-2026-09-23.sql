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
