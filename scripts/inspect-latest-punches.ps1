# Read-only — shows the most recent punches from the current month's table
# and a sample of real (non-test) employee codes, so we can confirm the
# test scan landed and see what employee codes actually look like.
#
# Usage: .\inspect-latest-punches.ps1 -DbPath "D:\essl\eTimeTrackLite\eTimeTrackLite1.mdb"

param(
    [Parameter(Mandatory = $true)]
    [string]$DbPath
)

$connString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connString)
$conn.Open()

function Run-Query($sql) {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sql
    $reader = $cmd.ExecuteReader()
    $rowCount = 0
    while ($reader.Read()) {
        $values = @()
        for ($i = 0; $i -lt $reader.FieldCount; $i++) {
            $values += "$($reader.GetName($i))=$($reader.GetValue($i))"
        }
        Write-Output "  $($values -join ', ')"
        $rowCount++
    }
    $reader.Close()
    if ($rowCount -eq 0) { Write-Output "  (no rows)" }
}

$month = (Get-Date).Month
$year = (Get-Date).Year
$table = "DeviceLogs_${month}_${year}"

Write-Output "=== Most recent punches in $table (this month) ==="
Run-Query "SELECT TOP 15 DeviceLogId, UserId, LogDate, C1, DownloadDate FROM $table ORDER BY DeviceLogId DESC"

Write-Output ""
Write-Output "=== Sample of real employee codes (Status = Working, not a del_ test row) ==="
Run-Query "SELECT TOP 20 EmployeeId, EmployeeCode, EmployeeName, Status FROM Employees WHERE Status='Working' AND EmployeeCode NOT LIKE 'del_%'"

$conn.Close()
Write-Output ""
Write-Output "=== Done ==="
