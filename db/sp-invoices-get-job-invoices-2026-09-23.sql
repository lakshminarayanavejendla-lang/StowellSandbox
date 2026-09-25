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
