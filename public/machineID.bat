@echo off
Rem Make powershell read this file, skip a number of lines, and execute it.
Rem This works around .ps1 bad file association as non executables.
PowerShell -Command "Get-Content '%~dpnx0' | Select-Object -Skip 5 | Out-String | Invoke-Expression"
goto :eof
# Start of PowerShell script here

Write-Host "Starting..." -ForegroundColor DarkCyan

$sha1 = New-Object System.Security.Cryptography.SHA1CryptoServiceProvider

# BB3 → Machine GUID
$guid = (Get-ItemProperty -Path 'HKLM:\Software\Microsoft\Cryptography').MachineGuid
$guidBytes = [System.Text.Encoding]::UTF8.GetBytes($guid)
$hashBytes = $sha1.ComputeHash($guidBytes)

$bb3_hash = -Join ($hashBytes | ForEach-Object {$_.ToString("x2")})

Write-Host "1/3 Done..." -ForegroundColor Green

# FF2 → Two MAC addresses in a 16 bytes array. Each address have 2 zeroes added at the end
# Find the first two physical network adapter
$adapters = Get-NetAdapter -Physical | Select-Object -First 2

# Concatenate the MAC addresses of the adapters into an array of bytes
$bytes = [byte[]]@()
foreach ($adapter in $adapters) {
    $macBytes = $adapter.MacAddress.Split("-") | ForEach-Object {[byte]("0x$_")}
    # Pad the MAC address bytes with zeroes until they are exactly 8 bytes long
    for ($i = $macBytes.Length; $i -lt 8; $i++) {
        $macBytes += 0
    }
    $bytes += $macBytes
}

# If there is only one network interface, append 8 zeroes to the $bytes array
if (!($adapters -is [array])) {
    for ($i = 0; $i -lt 8; $i++) {
        $bytes += 0
    }
}

$hash = $sha1.ComputeHash($bytes)
$ff2_hash = -Join ($hash | ForEach-Object {$_.ToString("x2")})

Write-Host "2/3 Done..." -ForegroundColor Green

# 3B3 → Boot disk serial number
$serial_number = (get-partition -DriveLetter C | get-disk).SerialNumber
$snBytes = [System.Text.Encoding]::UTF8.GetBytes($serial_number)
$hashBytes = $sha1.ComputeHash($snBytes)

$3b3_hash = -Join ($hashBytes | ForEach-Object {$_.ToString("x2")})

Write-Host "3/3 Done..." -ForegroundColor Green

# Create the base64 final string
$bytes = [byte[]]@()
$bytes += 0x00
$bytes += [System.Text.Encoding]::UTF8.GetBytes("MessageObject")
$bytes += 0x00
$bytes += 0x01
$bytes += [System.Text.Encoding]::UTF8.GetBytes("BB3")
$bytes += 0x00
$bytes += [System.Text.Encoding]::UTF8.GetBytes($bb3_hash)
$bytes += 0x00
$bytes += 0x01
$bytes += [System.Text.Encoding]::UTF8.GetBytes("FF2")
$bytes += 0x00
$bytes += [System.Text.Encoding]::UTF8.GetBytes($ff2_hash)
$bytes += 0x00
$bytes += 0x01
$bytes += [System.Text.Encoding]::UTF8.GetBytes("3B3")
$bytes += 0x00
$bytes += [System.Text.Encoding]::UTF8.GetBytes($3b3_hash)
$bytes += 0x00
$bytes += 0x08
$bytes += 0x08

$base64 = -Join ($bytes | ForEach-Object {$_.ToString("X2")})

Set-Clipboard -Value $base64
Write-Output ""
Write-Host $base64 -ForegroundColor Blue
Write-Host "The value has been saved in your clipboard" -ForegroundColor DarkGreen
Write-Output ""

pause