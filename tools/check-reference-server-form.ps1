param([Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$taskRepo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskOut=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $taskOut){throw 'Нужен новый каталог отдельной учебной базы'}
[IO.Directory]::CreateDirectory($taskOut)|Out-Null
$taskSource=Join-Path $taskOut 'source';$taskBase=Join-Path $taskOut 'server-form-base'
Copy-Item -LiteralPath (Join-Path $taskRepo 'courses\onec-education\native\service-desk-documents-v2') -Destination $taskSource -Recurse
function Save([string]$p,[string]$s){[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($p))|Out-Null;[IO.File]::WriteAllText($p,$s,[Text.UTF8Encoding]::new($true))}
$taskCard=(Get-Content -LiteralPath (Join-Path $taskRepo 'courses\reference\cards.ru.json') -Raw -Encoding utf8|ConvertFrom-Json)|Where-Object id -eq 'bsl-server'
$taskModule=Join-Path $taskSource 'Documents\ЗаявкаУслуги\Forms\УчебнаяФормаЗаявки\Ext\Form\Module.bsl'
Save $taskModule $taskCard.example
$taskForm=Join-Path $taskSource 'Documents\ЗаявкаУслуги\Forms\УчебнаяФормаЗаявки\Ext\Form.xml'
$taskXml=[IO.File]::ReadAllText($taskForm)
$taskXml=$taskXml.Replace('<AutoCommandBar name="" id="-1"/>','<AutoCommandBar name="" id="-1"><ChildItems><Button name="QAПроверить" id="101"><Type>UsualButton</Type><CommandName>Form.Command.Проверить</CommandName><ExtendedTooltip name="QAПроверитьПодсказка" id="102"/></Button></ChildItems></AutoCommandBar>')
$taskXml=$taskXml.Replace('</Form>','<Commands><Command name="Проверить" id="1"><Title><v8:item><v8:lang>ru</v8:lang><v8:content>Проверить серверный ответ</v8:content></v8:item></Title><Action>Проверить</Action></Command></Commands></Form>')
Save $taskForm $taskXml
$taskConfig=Join-Path $taskSource 'Configuration.xml';$taskConfigText=[IO.File]::ReadAllText($taskConfig)
Save $taskConfig ($taskConfigText.Replace('<v8:content>Учебная сервисная служба</v8:content>','<v8:content>Nexus Reference Server Form QA 20261112</v8:content>'))
Save (Join-Path $taskSource 'Ext\ManagedApplicationModule.bsl') @'
Процедура ПриНачалеРаботыСистемы()
    ОткрытьФорму("Документ.ЗаявкаУслуги.Форма.УчебнаяФормаЗаявки");
КонецПроцедуры
'@
$taskPlatform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe';$taskSteps=@()
function RunOwn([string]$name,[string[]]$arguments){$taskLog=Join-Path $taskOut ($name+'.private.log');$taskP=Start-Process -FilePath $taskPlatform -ArgumentList ($arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$taskLog+'"'))) -WindowStyle Hidden -PassThru;if(-not $taskP.WaitForExit(45000)){$taskP.Kill();throw ('Таймаут '+$name)};$taskP.Refresh();$script:taskSteps+=@{name=$name;exitCode=$taskP.ExitCode};$taskSteps|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $taskOut 'STEPS.json') -Encoding utf8;if($taskP.ExitCode -ne 0){throw ('Не прошла собственная native операция '+$name)};Write-Output ($name+': PASS')}
RunOwn 'create' @('CREATEINFOBASE',('File="'+$taskBase+'";'))
RunOwn 'load' @('DESIGNER','/F',('"'+$taskBase+'"'),'/LoadConfigFromFiles',('"'+$taskSource+'"'),'/UpdateDBCfg')
RunOwn 'check' @('DESIGNER','/F',('"'+$taskBase+'"'),'/CheckConfig','-ThinClient','-Server','-ConfigLogicalIntegrity')
@{status='NATIVE COMPILE PASS / GUI EXECUTION PENDING';platform='8.3.27.2214';cardId='bsl-server';sourceSha256=(Get-FileHash -LiteralPath $taskModule -Algorithm SHA256).Hash.ToLowerInvariant();moduleText=$taskCard.example;expectedMessage='5';ownBase=$taskBase;ownerDataUsed=$false;workingBasesChanged=0}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $taskOut 'RESULT.json') -Encoding utf8
Start-Process -FilePath $taskPlatform -ArgumentList @('ENTERPRISE','/F',('"'+$taskBase+'"'),'/DisableStartupDialogs','/DisableStartupMessages') -WindowStyle Normal
