-- 2026-09-26 - Warren Hampton's display standard: "You could eventually persist the [UI density] preference at the user's profile level."
-- One small table + two procedures. A user's UI density (comfortable / standard / compact) - and any future per-user setting - is stored
-- against their email, so it follows them to another computer, browser or tablet instead of living only in one browser.
-- Run against the SageSBQ database.

USE SageSBQ;
GO

IF OBJECT_ID('dbo.UserPreferences') IS NULL
BEGIN
    CREATE TABLE dbo.UserPreferences (
        Email        varchar(200) NOT NULL,
        PrefKey      varchar(50)  NOT NULL,
        PrefValue    varchar(200) NOT NULL,
        UpdatedDate  datetime     NOT NULL CONSTRAINT DF_UserPreferences_Updated DEFAULT GETDATE(),
        CONSTRAINT PK_UserPreferences PRIMARY KEY (Email, PrefKey)
    );
END
GO

-- UserPreference_Get - all of one user's saved settings
CREATE OR ALTER PROCEDURE dbo.UserPreference_Get
    @Email varchar(200)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT PrefKey, PrefValue FROM dbo.UserPreferences WHERE Email = LOWER(LTRIM(RTRIM(@Email)));
END
GO

-- UserPreference_Set - insert or update one setting
CREATE OR ALTER PROCEDURE dbo.UserPreference_Set
    @Email varchar(200),
    @PrefKey varchar(50),
    @PrefValue varchar(200)
AS
BEGIN
    SET NOCOUNT ON;

    SET @Email = LOWER(LTRIM(RTRIM(@Email)));
    IF LEN(@Email) = 0 OR LEN(LTRIM(RTRIM(ISNULL(@PrefKey, '')))) = 0
    BEGIN
        RAISERROR('An email and a setting name are required.', 16, 1);
        RETURN;
    END

    UPDATE dbo.UserPreferences SET PrefValue = @PrefValue, UpdatedDate = GETDATE() WHERE Email = @Email AND PrefKey = @PrefKey;
    IF @@ROWCOUNT = 0
        INSERT INTO dbo.UserPreferences (Email, PrefKey, PrefValue) VALUES (@Email, @PrefKey, @PrefValue);
END
GO
