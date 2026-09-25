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
