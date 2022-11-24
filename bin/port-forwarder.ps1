param (
    [switch]$Silent = $false, # Silent mode
    [switch]$Status = $false, # Prints opened ports
    [switch]$Close = $false # Closes opened ports
);

$Ports = @(3000);
$Address = "0.0.0.0";
$FirewallRule = "WSL2 Forwarded Ports";

# Requesting administrator privilege
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole] "Administrator"
)) {
    # PowerShell prior version 7 doesn't support ternary operator
    Start-Process -Verb RunAs -FilePath powershell.exe `
        -WindowStyle $(if ($Silent) {"Hidden"} else {"Normal"}) `
        -ArgumentList (
            "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" +
            $(if ($Silent) {" -Silent"} else {""}) +
            $(if ($Status) {" -Status"} else {""}) +
            $(if ($Close) {" -Close"} else {""})
        );
    exit;
}

function Interface-Reset {
    Remove-NetFireWallRule -DisplayName $FirewallRule -ErrorAction SilentlyContinue;
    netsh interface portproxy reset;
}

function Interface-Status {
    netsh interface portproxy show v4tov4;
}

if ($Status) {
    Interface-Status;
    pause;
    exit;
}

Interface-Reset;
if ($Close) {
    exit;
}

# Updating firewall rules and forwarding ports
New-NetFireWallRule -DisplayName $FirewallRule -LocalPort $Ports `
    -Direction Outbound -Action Allow -Protocol TCP;
New-NetFireWallRule -DisplayName $FirewallRule -LocalPort $Ports `
    -Direction Inbound -Action Allow -Protocol TCP;
$WslIp = bash.exe -c "ip -4 addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}'";
for ($i = 0; $i -lt $Ports.length; $i++) {
    $Port = $Ports[$i];
    netsh interface portproxy delete v4tov4 listenport=$Port listenaddress=$Address;
    netsh interface portproxy add v4tov4 listenport=$Port listenaddress=$Address `
        connectport=$Port connectaddress=$WslIp;
}

if (!$Silent) {
    Clear-Host;
    Interface-Status;
    try {
        Write-Host ">> Press Ctrl+C to close opened ports and exit" -ForegroundColor Red;
        while ($true) {
            Start-Sleep -Seconds 1;
        }
    } finally {
        # Resetting the interface on exit
        Interface-Reset;
    }
}
