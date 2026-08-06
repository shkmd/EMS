# Read-only — shows the most recent real punch records plus the employee
# master list (USERID <-> Badgenumber <-> name), so we can confirm exactly
# how CHECKTYPE encodes In/Out and how to map a device user to an EMS
# Employee, before writing any sync logic. Makes no changes.
#
# Usage: .\inspect-checkinout-sample.ps1 -DbPath "C:\eSSL\Access3.5\Access.mdb"

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

Write-Output "=== Most recent 20 punches (CHECKINOUT) ==="
Run-Query "SELECT TOP 20 USERID, CHECKTIME, CHECKTYPE, VERIFYCODE, MachineId FROM CHECKINOUT ORDER BY CHECKTIME DESC"

Write-Output ""
Write-Output "=== Employee master (USERINFO) - first 20 ==="
Run-Query "SELECT TOP 20 USERID, Badgenumber, name, DEFAULTDEPTID FROM USERINFO"

$conn.Close()
Write-Output ""
Write-Output "=== Done ==="
