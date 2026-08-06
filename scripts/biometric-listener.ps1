# Real-time biometric listener  -  connects directly to the eSSL/ZKTeco
# fingerprint device over the network and pushes each scan to EMS the
# instant it happens, instead of waiting for eTimeTrackLite to download
# anything. This is what gives genuinely instant check-in/check-out.
#
# HOW THIS IS DIFFERENT FROM biometric-bridge.ps1:
#   biometric-bridge.ps1  polls eTimeTrackLite's Access DB every few
#                         minutes  -  only sees punches after a manual
#                         "Download" inside eTimeTrackLite.
#   biometric-listener.ps1 talks to the device directly (same network
#                         protocol eTimeTrackLite itself uses) and gets a
#                         live event the moment someone scans a finger.
#                         It's a long-running process, not a scheduled
#                         one-shot script.
# Keep biometric-bridge.ps1 running too (e.g. hourly) as a safety net that
# reconciles anything this listener misses during a disconnect  -  both post
# to the same idempotent EMS endpoint, so running both is safe.
#
# UNVERIFIED AGAINST YOUR ACTUAL DEVICE  -  READ BEFORE USING:
# This is built from the standard eSSL/ZKTeco "zkemkeeper" SDK's documented
# behavior, not something tested against your specific device or SDK
# version. The event's argument order in particular has drifted across SDK
# versions in the wild. Do NOT skip the dry-run step below.
#
# === Setup ===
# 1. Find zkemkeeper.dll (it ships with eTimeTrackLite / the ZKTeco
#    "Standalone SDK" installer  -  search the eTimeTrackLite install folder,
#    or look for a separate SDK installer you may have received with the
#    device). Register it (needs an elevated/Administrator prompt):
#      C:\Windows\SysWOW64\regsvr32.exe "C:\path\to\zkemkeeper.dll"
#    It's a 32-bit COM component, so it must be registered with the 32-bit
#    regsvr32 (SysWOW64, not System32) and driven from 32-bit PowerShell:
#      C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe
#
# 2. Dry run first (default  -  logs every scan, sends nothing to EMS):
#      .\biometric-listener.ps1 -DeviceIp "192.168.1.201" -DevicePort 4370 `
#        -ApiBaseUrl "https://ems.deployandtest.com" -ApiKey "<key>"
#    Scan a test finger on the device and confirm in biometric-listener.log
#    that EnrollNumber matches the person's eTimeTrackLite EmployeeCode, and
#    that AttState is 0 when you scan as check-in and 1 as check-out. If the
#    values look wrong, fix the field mapping below before going further.
#
# 3. Once confirmed, add -Live to actually post punches to EMS:
#      .\biometric-listener.ps1 -DeviceIp "192.168.1.201" -DevicePort 4370 `
#        -ApiBaseUrl "https://ems.deployandtest.com" -ApiKey "<key>" -Live
#
# 4. This must stay running continuously (it's an event listener, not a
#    poll)  -  set it up as a Task Scheduler task triggered "At startup",
#    action = 32-bit powershell.exe with the args above, "Run whether user
#    is logged in or not", and on the Settings tab enable "Restart the task
#    if it fails" every 1 minute, indefinitely.

param(
    [Parameter(Mandatory = $true)]
    [string]$DeviceIp,

    [int]$DevicePort = 4370,
    [int]$MachineNumber = 1,

    [Parameter(Mandatory = $true)]
    [string]$ApiBaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$ApiKey,

    # Actually POST to EMS. Omit this to dry-run (log only)  -  see step 2 above.
    [switch]$Live,

    [string]$LogFile = (Join-Path $PSScriptRoot "biometric-listener.log")
)

Add-Type -AssemblyName System.Windows.Forms

function Write-Log($message) {
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
    Write-Output $line
    Add-Content -Path $LogFile -Value $line
}

$endpoint = "$($ApiBaseUrl.TrimEnd('/'))/api/integrations/biometric/punch"

function Send-Punch($biometricId, $direction, $punchTime) {
    if (-not $Live) {
        Write-Log "[DRY RUN] Would send: employee $biometricId $direction at $punchTime"
        return
    }
    $body = @{ biometricId = $biometricId; direction = $direction; punchTime = $punchTime } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri $endpoint -Method Post -ContentType "application/json" `
            -Headers @{ "x-api-key" = $ApiKey } -Body $body -TimeoutSec 15 | Out-Null
        Write-Log "Synced: employee $biometricId $direction at $punchTime"
    }
    catch {
        $detail = $_.Exception.Message
        if ($_.ErrorDetails.Message) { $detail = $_.ErrorDetails.Message }
        Write-Log "FAILED to sync employee $biometricId ${direction}: $detail"
    }
}

Write-Log "Starting listener (mode: $(if ($Live) { 'LIVE' } else { 'DRY RUN' })) for device $DeviceIp`:$DevicePort"

try {
    $zk = New-Object -ComObject zkemkeeper.zkem
}
catch {
    Write-Log "Could not create the zkemkeeper COM object. Is zkemkeeper.dll registered? Are you running 32-bit PowerShell? $($_.Exception.Message)"
    exit 1
}

function Connect-Device {
    if ($zk.Connect_Net($DeviceIp, $DevicePort)) {
        Write-Log "Connected to device."
        $zk.RegEvent($MachineNumber, 65535) | Out-Null
        return $true
    }
    Write-Log "Connect_Net failed  -  will retry."
    return $false
}

if (-not (Connect-Device)) {
    Write-Log "Initial connection failed. Exiting  -  Task Scheduler's restart-on-failure will retry."
    exit 1
}

# AttState mapping confirmed from eTimeTrackLite's own AttendanceStates
# table: 0 = Check-In, 1 = Check-Out, 2 = Break-Out. This listener only
# handles plain in/out for now; break punches are logged and skipped.
Register-ObjectEvent -InputObject $zk -EventName OnAttTransactionEx -SourceIdentifier "ZK_OnAttTransactionEx" -Action {
    $evtArgs = $Event.SourceArgs
    Write-Log "[DEBUG] raw event args: $($evtArgs -join ', ')"

    $enrollNumber = [string]$evtArgs[0]
    $attState = [int]$evtArgs[2]
    $year = [int]$evtArgs[4]; $month = [int]$evtArgs[5]; $day = [int]$evtArgs[6]
    $hour = [int]$evtArgs[7]; $minute = [int]$evtArgs[8]; $second = [int]$evtArgs[9]

    $punchTime = [DateTime]::new($year, $month, $day, $hour, $minute, $second)
    $punchTimeIso = Get-Date $punchTime -Format "yyyy-MM-ddTHH:mm:sszzz"

    $direction = switch ($attState) {
        0 { "IN" }
        1 { "OUT" }
        default { $null }
    }

    if (-not $direction) {
        Write-Log "Scan from EnrollNumber $enrollNumber has AttState $attState (not a plain in/out)  -  skipping."
        return
    }

    Send-Punch -biometricId $enrollNumber -direction $direction -punchTime $punchTimeIso
} | Out-Null

Register-ObjectEvent -InputObject $zk -EventName OnDisConnected -SourceIdentifier "ZK_OnDisConnected" -Action {
    Write-Log "Device disconnected  -  will attempt to reconnect."
} | Out-Null

# Periodic reconnect check  -  zkemkeeper connections can silently drop during
# a long unattended run.
$reconnectTimer = New-Object System.Windows.Forms.Timer
$reconnectTimer.Interval = 30000
Register-ObjectEvent -InputObject $reconnectTimer -EventName Tick -SourceIdentifier "ZK_ReconnectTick" -Action {
    if (-not $zk.Connect_Net($DeviceIp, $DevicePort)) { return }
    $zk.RegEvent($MachineNumber, 65535) | Out-Null
} | Out-Null
$reconnectTimer.Start()

Write-Log "Listening for punches. This process must keep running (Ctrl+C or closing the window stops it)."

# Keeps the COM event callbacks pumping  -  zkemkeeper is a legacy ActiveX
# control that needs a real Windows message loop to fire events, which a
# bare PowerShell console does not provide on its own.
[System.Windows.Forms.Application]::Run()
