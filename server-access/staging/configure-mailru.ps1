param([Parameter(Mandatory=$true)][string]$StateDirectory,[string]$Sender)
$ErrorActionPreference='Stop'
$stageFile=Join-Path (Resolve-Path -LiteralPath $StateDirectory).Path 'staging.private.json'
$stageState=Get-Content -LiteralPath $stageFile -Raw | ConvertFrom-Json
if ($stageState.purpose -ne 'invited-password-isolated-staging' -or $stageState.name -notmatch '^nexus-password-staging-[a-f0-9]{12}$' -or $stageState.databaseId -eq '0995b7f0-2e4c-42a5-a25f-422d4b741d59') { throw 'STAGING_TARGET_REJECTED' }
# A masked local dialog keeps the password out of chat, shell arguments and logs.
Add-Type -AssemblyName System.Windows.Forms
$dialog=[System.Windows.Forms.Form]::new()
$dialog.Text='Nexus Staging — подключение Mail.ru'
$dialog.Width=610;$dialog.Height=270;$dialog.StartPosition='CenterScreen';$dialog.FormBorderStyle='FixedDialog'
$dialog.MaximizeBox=$false;$dialog.MinimizeBox=$false;$dialog.TopMost=$true
$instruction=[System.Windows.Forms.Label]::new();$instruction.SetBounds(20,15,555,48)
$instruction.Text='Введите отдельный пароль внешнего приложения «Nexus Staging». Не вводите обычный пароль от почты. Он сохранится только в закрытых настройках staging на этом компьютере.'
$address=[System.Windows.Forms.TextBox]::new();$address.SetBounds(20,72,550,27);$address.Text=$Sender
$passwordBox=[System.Windows.Forms.TextBox]::new();$passwordBox.SetBounds(20,116,550,27);$passwordBox.UseSystemPasswordChar=$true
$submit=[System.Windows.Forms.Button]::new();$submit.SetBounds(345,169,110,32);$submit.Text='Подключить';$submit.DialogResult=[System.Windows.Forms.DialogResult]::OK
$cancel=[System.Windows.Forms.Button]::new();$cancel.SetBounds(465,169,105,32);$cancel.Text='Отмена';$cancel.DialogResult=[System.Windows.Forms.DialogResult]::Cancel
$dialog.Controls.AddRange(@($instruction,$address,$passwordBox,$submit,$cancel));$dialog.AcceptButton=$submit;$dialog.CancelButton=$cancel
$answer=$dialog.ShowDialog()
if ($answer -ne [System.Windows.Forms.DialogResult]::OK) { $dialog.Dispose();Write-Output 'MAIL_SETUP_CANCELLED_CAPTURE_UNCHANGED';exit 0 }
$senderAddress=$address.Text.Trim();$appSecret=$passwordBox.Text;$passwordBox.Clear();$dialog.Dispose()
if ($senderAddress -notmatch '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@(mail|bk|list|inbox|internet)\.ru$') { throw 'MAILRU_ADDRESS_REQUIRED' }
if ($appSecret.Length -lt 8 -or $appSecret.Length -gt 512) { throw 'APPLICATION_PASSWORD_REQUIRED' }
$stageState | Add-Member -NotePropertyName mailProvider -NotePropertyValue 'mailru' -Force
$stageState | Add-Member -NotePropertyName smtpUser -NotePropertyValue $senderAddress -Force
$stageState | Add-Member -NotePropertyName smtpPassword -NotePropertyValue $appSecret -Force
$stageState | Add-Member -NotePropertyName mailFrom -NotePropertyValue $senderAddress -Force
$stageState.mailMode='live'
[System.IO.File]::WriteAllText($stageFile,($stageState | ConvertTo-Json -Depth 10),[System.Text.UTF8Encoding]::new($false))
$privateAcl=Get-Acl -LiteralPath $stageFile
$privateAcl.SetAccessRuleProtection($true,$false)
$currentIdentity=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$privateAcl.SetAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($currentIdentity,'FullControl','Allow'))
$privateAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new([System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'),'FullControl','Allow'))
Set-Acl -LiteralPath $stageFile -AclObject $privateAcl
$appSecret=$null
Write-Output 'Отправитель настроен только для staging. После перезапуска стенд сможет писать только на ранее заданный тестовый адрес.'
