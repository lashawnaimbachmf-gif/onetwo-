Add-Type -AssemblyName Microsoft.VisualBasic
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut("C:\Users\sheng'zhang\Desktop\HBuilderX.lnk")
$targetPath = $shortcut.TargetPath
Write-Host "Target: $targetPath"
if ($targetPath) {
    Start-Process -FilePath $targetPath -ArgumentList "C:\Users\sheng'zhang\Desktop\mini program\点餐程序"
    Write-Host "HBuilderX opened successfully"
} else {
    Write-Host "Failed to get shortcut target"
}