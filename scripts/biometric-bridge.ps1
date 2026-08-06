# Biometric bridge  -  relays new fingerprint punches from the eTimeTrackLite
# Access database to EMS, so check-in/check-out happens automatically
# instead of waiting for someone to open the payroll/attendance module.
#
# Run this on the office PC that has eTimeTrackLite installed (the one with
# read access to the .mdb file). It is NOT a background daemon  -  it makes
# one pass over new rows and exits. Schedule it to run every few minutes via
# Windows Task Scheduler (see the setup notes at the bottom of this file).
#
# IMPORTANT LIMITATION: eTimeTrackLite's database only gains new rows when a
# human clicks "Download" in the eTimeTrackLite software to pull punches off
# the device. This script cannot see a punch that hasn't been downloaded
# into the .mdb yet  -  it only relays what's already there. True "instant"
# check-in requires eTimeTrackLite's own auto-download/schedule feature (if
# it has one) to be turned on; otherwise the fastest this can be is "as
# fresh as the last manual download."
#
# Usage:
#   .\biometric-bridge.ps1 `
#     -DbPath "D:\essl\eTimeTrackLite\eTimeTrackLite1.mdb" `
#     -ApiBaseUrl "https://ems.deployandtest.com" `
#     -ApiKey "the BIOMETRIC_SYNC_API_KEY value from the EMS server"
#
# State (which rows have already been sent) is kept in a small JSON file
# next to this script (-StateFile to override) so re-runs never resend a
# punch that was already delivered. It resets automatically when
# eTimeTrackLite rolls over to a new month's DeviceLogs_<month>_<year> table.

param(
    [Parameter(Mandatory = $true)]
    [string]$DbPath,

    [Parameter(Mandatory = $true)]
    [string]$ApiBaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$ApiKey,

    [string]$StateFile = (Join-Path $PSScriptRoot "biometric-bridge-state.json"),
    [string]$LogFile = (Join-Path $PSScriptRoot "biometric-bridge.log")
)

function Write-Log($message) {
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
    Write-Output $line
    Add-Content -Path $LogFile -Value $line
}

function Load-State($table) {
    if (Test-Path $StateFile) {
        try {
            $state = Get-Content $StateFile -Raw | ConvertFrom-Json
            if ($state.table -eq $table) {
                return [int]$state.lastId
            }
            Write-Log "New month table detected ($table)  -  resetting cursor."
        }
        catch {
            Write-Log "Could not read state file, starting from 0: $($_.Exception.Message)"
        }
    }
    return 0
}

function Save-State($table, $lastId) {
    @{ table = $table; lastId = $lastId } | ConvertTo-Json | Set-Content -Path $StateFile
}

$endpoint = "$($ApiBaseUrl.TrimEnd('/'))/api/integrations/biometric/punch"

$connString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connString)

try {
    $conn.Open()
}
catch {
    Write-Log "Could not open database: $($_.Exception.Message)"
    exit 1
}

$month = (Get-Date).Month
$year = (Get-Date).Year
$table = "DeviceLogs_${month}_${year}"
$lastId = Load-State $table

# Build a UserId -> EmployeeCode lookup once per run (cheaper than a query
# per punch, and DeviceLogs.UserId is confirmed to store Employees.EmployeeCode).
$codeByUserId = @{}
$empCmd = $conn.CreateCommand()
$empCmd.CommandText = "SELECT EmployeeId, EmployeeCode FROM Employees WHERE EmployeeCode NOT LIKE 'del_%'"
$reader = $empCmd.ExecuteReader()
while ($reader.Read()) {
    $codeByUserId[[string]$reader["EmployeeId"]] = [string]$reader["EmployeeCode"]
}
$reader.Close()

$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT DeviceLogId, UserId, LogDate, C1 FROM $table WHERE DeviceLogId > $lastId ORDER BY DeviceLogId ASC"
$reader = $cmd.ExecuteReader()

$rows = @()
while ($reader.Read()) {
    $rows += [PSCustomObject]@{
        DeviceLogId = [int]$reader["DeviceLogId"]
        UserId      = [string]$reader["UserId"]
        LogDate     = [DateTime]$reader["LogDate"]
        C1          = [string]$reader["C1"]
    }
}
$reader.Close()
$conn.Close()

if ($rows.Count -eq 0) {
    Write-Log "No new punches (cursor at $lastId in $table)."
    exit 0
}

Write-Log "Found $($rows.Count) new punch(es) in $table since DeviceLogId $lastId."

foreach ($row in $rows) {
    $biometricId = $codeByUserId[$row.UserId]
    if (-not $biometricId) {
        Write-Log "Skipping DeviceLogId $($row.DeviceLogId): no active employee found for UserId $($row.UserId)."
        $lastId = $row.DeviceLogId
        Save-State $table $lastId
        continue
    }

    $direction = switch -Regex ($row.C1) {
        "in"  { "IN"; break }
        "out" { "OUT"; break }
        default { $null }
    }
    if (-not $direction) {
        Write-Log "Skipping DeviceLogId $($row.DeviceLogId): unrecognized punch type '$($row.C1)'."
        $lastId = $row.DeviceLogId
        Save-State $table $lastId
        continue
    }

    # LogDate comes back as the device's local wall-clock time; format it
    # with this machine's local UTC offset so EMS interprets it correctly
    # (assumes this bridge runs on a PC in the same timezone as the device).
    $punchTime = Get-Date $row.LogDate -Format "yyyy-MM-ddTHH:mm:sszzz"

    $body = @{
        biometricId = $biometricId
        direction   = $direction
        punchTime   = $punchTime
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri $endpoint -Method Post -ContentType "application/json" `
            -Headers @{ "x-api-key" = $ApiKey } -Body $body -TimeoutSec 15 | Out-Null
        Write-Log "Synced DeviceLogId $($row.DeviceLogId): employee $biometricId $direction at $punchTime."
        $lastId = $row.DeviceLogId
        Save-State $table $lastId
    }
    catch {
        $detail = $_.Exception.Message
        if ($_.ErrorDetails.Message) { $detail = $_.ErrorDetails.Message }
        Write-Log "FAILED to sync DeviceLogId $($row.DeviceLogId) (employee $biometricId $direction): $detail"
        Write-Log "Stopping this run so the failed punch is retried next time (cursor left at $lastId)."
        exit 1
    }
}

Write-Log "Done. Cursor now at $lastId in $table."

<#
=== One-time setup on the office PC ===

1. Ask EMS admin for the BIOMETRIC_SYNC_API_KEY value (it's an env var on
   the EMS server, not something you generate here).

2. Test it manually first:
     .\biometric-bridge.ps1 -DbPath "D:\essl\eTimeTrackLite\eTimeTrackLite1.mdb" `
       -ApiBaseUrl "https://ems.deployandtest.com" -ApiKey "<the key>"
   Check biometric-bridge.log next to the script for what happened.

3. Map each employee's device code to their EMS profile: EMS > Employees >
   edit each employee > Employment tab > "Biometric ID" field. Use the
   EmployeeCode shown in eTimeTrackLite for that person (small integer like
   "6", "51", "45").

4. Schedule it to run every few minutes via Task Scheduler:
     Action: Start a program
       Program: powershell.exe
       Arguments: -NoProfile -ExecutionPolicy Bypass -File "C:\path\to\biometric-bridge.ps1" -DbPath "D:\essl\eTimeTrackLite\eTimeTrackLite1.mdb" -ApiBaseUrl "https://ems.deployandtest.com" -ApiKey "<the key>"
     Trigger: Repeat every 5 minutes, indefinitely
   Run it whether or not a user is logged in, since the office PC may lock.

5. Remember: this only relays punches once eTimeTrackLite has downloaded
   them from the device. If eTimeTrackLite has an auto-download/schedule
   setting (check Utilities/Masters menus), turn it on  -  otherwise punches
   stay invisible to this bridge until someone manually clicks Download.
#>
