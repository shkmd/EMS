# Read-only inspection script — lists every table and column in the
# eTimeTrackLite MS Access database, so we can see the real schema before
# writing any sync logic against it. Makes no changes to the database.
#
# Usage:
#   1. Find the .mdb/.accdb file path via eTimeTrackLite's "Database Setting" screen.
#   2. Run:  .\inspect-etimetrack-db.ps1 -DbPath "C:\path\to\database.mdb"
#   3. Paste the full output back.
#
# If you get "Provider cannot be found" — your Access Database Engine may be
# 32-bit only. Re-run this same command from the 32-bit PowerShell instead:
#   C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe -File .\inspect-etimetrack-db.ps1 -DbPath "..."

param(
    [Parameter(Mandatory = $true)]
    [string]$DbPath
)

if (-not (Test-Path $DbPath)) {
    Write-Error "File not found: $DbPath"
    exit 1
}

$connString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connString)

try {
    $conn.Open()
}
catch {
    Write-Error "Could not open the database. If this says the provider isn't registered, try running this script from 32-bit PowerShell instead (see the note at the top of this file). Full error: $($_.Exception.Message)"
    exit 1
}

Write-Output "=== Connected OK ==="
Write-Output ""

$tables = $conn.GetOleDbSchemaTable([System.Data.OleDb.OleDbSchemaGuid]::Tables, $null)

foreach ($tableRow in $tables.Rows) {
    if ($tableRow["TABLE_TYPE"] -ne "TABLE") { continue }
    $tableName = $tableRow["TABLE_NAME"]

    Write-Output "TABLE: $tableName"

    $columns = $conn.GetOleDbSchemaTable(
        [System.Data.OleDb.OleDbSchemaGuid]::Columns,
        @($null, $null, $tableName, $null)
    )
    foreach ($colRow in $columns.Rows) {
        Write-Output ("  - {0} ({1})" -f $colRow["COLUMN_NAME"], $colRow["DATA_TYPE"])
    }

    # Show a couple of sample rows so we can see real values (e.g. how
    # in/out direction and timestamps are actually represented).
    try {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT TOP 3 * FROM [$tableName]"
        $reader = $cmd.ExecuteReader()
        $rowNum = 0
        while ($reader.Read() -and $rowNum -lt 3) {
            $values = @()
            for ($i = 0; $i -lt $reader.FieldCount; $i++) {
                $values += "$($reader.GetName($i))=$($reader.GetValue($i))"
            }
            Write-Output "  sample row: $($values -join ', ')"
            $rowNum++
        }
        $reader.Close()
    }
    catch {
        Write-Output "  (couldn't read sample rows: $($_.Exception.Message))"
    }

    Write-Output ""
}

$conn.Close()
Write-Output "=== Done ==="
