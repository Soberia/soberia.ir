---
id: 2
date: 2023-02-18T01:20:00Z
dateEdited: 2024-01-23T13:50:00Z
title: Poor man's hardware wallet with USB flash drive and Exodus
description: The instruction to turn an USB drive to a hardware crypto wallet with Exodus crypto wallet app on the Windows.
banner: banner.webp
tags:
  - PowerShell
  - Crypto Wallet
  - Exodus
...

## Introduction

For making your hardware crypto wallet, you can use any kind of writable external storage like SD cards, hard drives, or your old MP3 player! However, it's better to use brand-new storage that's not already been worn out.

It's possible to install a whole operation system like a Linux distro on your USB drive and then install the wallet on it, but in my opinion, it's error-prone and overkill. Besides, you have to turn off your system and boot from your slow USB drive each time you want to access the wallet. So I think it's better to only install the wallet alone on your external storage device.

## Encrypting the USB drive

> **Note**  
> If you don't want to encrypt your storage, you can skip this section. However, it's highly recommended to do so.

Format your USB drive as `exFAT` (recommended) or `FAT32` file system.  
Press `Win+R` and type `control /name Microsoft.BitLockerDriveEncryption` and hit Enter. Then turn on the `BitLocker` for the USB drive, choose a password and store your recovery key somewhere safe. You also have an option to backup the encryption recovery key on your Microsoft account which is pretty convenient.

If your Windows variant doesn't support `BitLocker`, you can use [other third-party software](https://en.wikipedia.org/wiki/Comparison_of_disk_encryption_software) instead.

## Installing Exodus on the USB drive

Download the [Exodus Desktop](https://www.exodus.com/download/) setup file for Windows. You can either manually install it on your local machine and copy the installed files (located on `%LOCALAPPDATA%`) into your USB drive and place it inside the `bin` directory or do it with the following automated script.  
Just open up the `PowerShell` console from where the downloaded file is located and copy these commands on the console and run it: (on the second line, change the drive letter `X:` to your USB drive's)

```powershell line="1" highlight="2"
Start-Process -Wait -FilePath ".\exodus-windows-*.exe" -ArgumentList "--silent"
Copy-Item -Recurse -Path "$env:LocalAppData\exodus\app*" -Destination "X:\Exodus\bin"
Start-Process -Wait -FilePath "$env:LocalAppData\exodus\Update.exe" -ArgumentList "--uninstall ."
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue `
    "$env:AppData\exodus",
    "$env:LocalAppData\exodus",
    "$env:LocalAppData\SquirrelTemp"
```

To update the Exodus app, remove the previous binaries located in the `bin` directory on the USB drive and repeat the procedure.

## Rearranging the folder structure

It's not possible to run the Exodus from the USB drive yet. Exodus always reads the `%APPDATA%` environment variable directly from the registry and puts its data where this variable points to, no matter where the binary files are located. That is, Exodus' data files which include your wallet private key, will still be stored on the local machine and not on the USB drive!  
The following `PowerShell` script helps us to dynamically change the mentioned registry value before running the Exodus and restore it to its initial value after the app is closed. Therefore, Exodus' data files will be placed inside the `data` directory next to the `bin` directory on the USB drive.

Store the following script as `run.ps1` beside the `bin` directory on your USB drive.

> **Warning**  
> Please review the script line by line. I'm not planning to steal your money, but you should never trust anything you find on the internet, especially in this matter.

```powershell filename="run.ps1"
<#
    This script forces the Exodus app to store its data in the same
    place where it's located by changing the related registry keys.
    Tested on Windows 11 (Build 26020) and Exodus version 24.1.15
#>

$ErrorActionPreference = "Stop"
$Failed = $false
$Loaded = $false
$Data = "$PSScriptRoot\data"
$Bin = "$PSScriptRoot\bin\Exodus.exe"
$Key = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders"
$Backup = (Get-Item -Path $Key).GetValue(
    "AppData",
    "%USERPROFILE%\AppData\Roaming",
    "DoNotExpandEnvironmentNames"
)

$Process = New-Object System.Diagnostics.Process -Property @{
    StartInfo = New-Object System.Diagnostics.ProcessStartInfo -Property @{
        FileName = $Bin
        RedirectStandardError = $true
        RedirectStandardOutput = $true
        UseShellExecute = $false
    }
}

# A watcher process is required to be spawned to restore the registry
# modifications to the initial value on Exodus exit whenever the
# PowerShell console has been closed by `X` button by the user.
# See https://github.com/PowerShell/PowerShell/issues/8000
$Watcher = New-Object System.Diagnostics.Process -Property @{
    StartInfo = New-Object System.Diagnostics.ProcessStartInfo -Property @{
        FileName = "powershell.exe"
        WindowStyle = "Hidden"
    }
}
$WatcherBlock = {
    function Cleanup($ProcessId, $Key, $Backup) {
        $Process = (Get-Process -Id $ProcessId)
        while ($true) {
            Start-Sleep -Milliseconds 100
            if ($Process.HasExited) {
                Set-ItemProperty -Path $Key -Name AppData -Value $Backup
                break
            }
        }
    }
}

# Checking the existence of required files
If (-Not (Test-Path -PathType Leaf $Bin)) {
    Write-Host -ForegroundColor Red `
        "Can't find the Exodus binary files," `
        "they should be placed in the 'bin' directory next to this script."
    Read-Host
    exit 1
} elseif (-Not (Test-Path -PathType Container $Data)) {
    New-Item -ItemType Directory -Path $Data | Out-Null
}

try {
    Write-Host -NoNewline -ForegroundColor DarkCyan "Please wait..."
    Set-ItemProperty -Path $Key -Name AppData -Value $Data
    $Process.Start() | Out-Null
    $Watcher.StartInfo.Arguments = "-Command & {$WatcherBlock Cleanup $($Process.Id) '$Key' '$Backup'}"
    $Watcher.Start() | Out-Null
    while (-Not $Process.HasExited) {
        if ($Loaded) {
            Start-Sleep -Milliseconds 100
        } elseif (-Not $Process.StandardOutput.EndOfStream) {
            $Line = $Process.StandardOutput.ReadLine()
            if (Select-String -Quiet -InputObject $Line -Pattern "DATA DIR") {
                if (Select-String -Quiet -NotMatch -SimpleMatch -InputObject $Line -Pattern $Data) {
                    # Exodus still uses the default `%APPDATA%` value!
                    $Failed = $true
                    $Process.Kill()
                    break
                }
            } elseif (Select-String -Quiet -InputObject $Line -Pattern "LOADED") {
                $Loaded = $true
                Write-Host -ForegroundColor DarkGreen " (Exodus is loaded successfully!)"
                Write-Host -ForegroundColor DarkCyan "This window will be closed on Exodus exit." `
                    "(press Ctrl+C to exit)"
            }
        }
    }
} finally {
    Write-Host
    Set-ItemProperty -Path $Key -Name AppData -Value $Backup
    $Watcher.Kill()
    if ($Failed) {
        Write-Host -ForegroundColor Red `
            "Failed to do the job possibly due to change in the Exodus behavior!"
        Read-Host
        exit 1
    } elseif (-Not $Process.HasExited) {
        Write-Host -ForegroundColor Red "Exodus is closing," `
            "please do not remove your USB drive!"
        Start-Process `
            -Wait `
            -WindowStyle Hidden `
            -FilePath powershell.exe `
            -ArgumentList "-Command `"(Get-Process -Id $($Process.Id)).CloseMainWindow()`""
        $Process.WaitForExit()
    }
}
```

## Opening the wallet

For being able to the `run.ps1` script, first you need to execute the following command as administrator in the `PowerShell` console:

```powershell
Set-ExecutionPolicy RemoteSigned
```

Finally, you can right-click on the `run.ps1` and select `Run with PowerShell` to open the Exodus!  
And to to prevent data loss, before removing the USB drive, make sure the Exodus app closed properly and not running in the background.

Your USB drive folder structure should be like this after running the `run.ps1` script:

```
USB Drive
└──Exodus
   └──bin     # Exodus binary files
   └──data    # Exodus cache and your private keys
   │  run.ps1
```
