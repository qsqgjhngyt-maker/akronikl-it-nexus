param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$platform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe'
if(-not(Test-Path -LiteralPath $platform -PathType Leaf)){throw 'Официальная платформа отсутствует'}
$dest=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $dest){throw 'Нужен новый каталог: существующие результаты сохраняются'}
New-Item -ItemType Directory -Path $dest | Out-Null
$steps=[Collections.Generic.List[object]]::new();$cases=[Collections.Generic.List[object]]::new()
$enc=[Text.UTF8Encoding]::new($false)
function Invoke-Native([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log')
 $process=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $process.WaitForExit(45000)){$process.Kill();throw ('Таймаут только созданного тестового процесса: '+$Name)}
 $text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'}
 $steps.Add([pscustomobject]@{name=$Name;exitCode=$process.ExitCode;classification=$class})
 if($process.ExitCode -ne 0){throw ('Не выполнен шаг '+$Name+'; '+$class)}
}
try{
 $source=Join-Path $dest 'source';$old=Join-Path $Repo 'courses\onec-education\native\service-desk-a2p2'
 foreach($relative in @('Configuration.xml','Catalogs\Клиенты.xml','Languages\Русский.xml')){$target=Join-Path $source $relative;New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null;Copy-Item -LiteralPath (Join-Path $old $relative) -Destination $target}
 $configPath=Join-Path $source 'Configuration.xml';$config=[IO.File]::ReadAllText($configPath)
 foreach($line in @('<Catalog>Услуги</Catalog>','<Enum>СтатусыЗаявки</Enum>','<Document>ЗаявкаУслуги</Document>','<Subsystem>УчебнаяСлужба</Subsystem>')){$config=$config.Replace($line,'')}
 $config=$config.Replace('NexusTrainingServiceDeskA2P2','NexusBeginnerServiceDesk').Replace('0.2.0-a2p2','2.0.0-pedagogy.1')
 [IO.File]::WriteAllText($configPath,$config,$enc)
 New-Item -ItemType Directory -Path (Join-Path $source 'Ext') | Out-Null
 $base=Join-Path $dest 'test-base';Invoke-Native 'create-base' @('CREATEINFOBASE',('File="'+$base+'";'))
 $modulePath=Join-Path $source 'Ext\ManagedApplicationModule.bsl'
 $fragment=[IO.File]::ReadAllText((Join-Path $Repo 'courses\onec-education\code\pedagogy\first-calculation.bsl')).Trim()
 $variants=@(
 @{id='PED.P2.first-75';code=$fragment;expect=75},
 @{id='PED.P2.changed-50';code=$fragment.Replace('= 45;','= 20;');expect=50},
 @{id='PED.P2.third-90';code=$fragment.Replace('ВсегоМинут =','МинутыТретьейЗаявки = 15;'+[Environment]::NewLine+'ВсегоМинут =').Replace('+ МинутыВторойЗаявки;','+ МинутыВторойЗаявки + МинутыТретьейЗаявки;');expect=90},
 @{id='PED.P2.independent-40';code=$fragment.Replace('= 30;','= 10;').Replace('= 45;','= 25;').Replace('ВсегоМинут =','МинутыТретьейЗаявки = 5;'+[Environment]::NewLine+'ВсегоМинут =').Replace('+ МинутыВторойЗаявки;','+ МинутыВторойЗаявки + МинутыТретьейЗаявки;');expect=40},
 @{id='PED.P2.zero-15';code=$fragment.Replace('= 30;','= 10;').Replace('= 45;','= 0;').Replace('ВсегоМинут =','МинутыТретьейЗаявки = 5;'+[Environment]::NewLine+'ВсегоМинут =').Replace('+ МинутыВторойЗаявки;','+ МинутыВторойЗаявки + МинутыТретьейЗаявки;');expect=15},
 @{id='PED.P2.minus-negative-15';code=$fragment.Replace('+ МинутыВторойЗаявки;','- МинутыВторойЗаявки;');expect=-15}
 )
 foreach($v in $variants){
  $result=Join-Path $dest ($v.id+'.txt');$safeResult=$result.Replace('"','""')
  # Исходный учебный фрагмент выполняет сама 1С. Обвязка только сверяет значение и пишет ограниченный протокол.
  $body="Процедура ПриНачалеРаботыСистемы()`r`n"+$v.code+"`r`n"+@"
    Протокол = Новый ТекстовыйДокумент;
    Если ВсегоМинут = $($v.expect) Тогда
        Протокол.УстановитьТекст("$($v.id)|PASS|" + Строка(ВсегоМинут));
    Иначе
        Протокол.УстановитьТекст("$($v.id)|FAIL");
    КонецЕсли;
    Протокол.Записать("$safeResult", КодировкаТекста.UTF8);
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
"@
  [IO.File]::WriteAllText($modulePath,$body,$enc)
  Invoke-Native ($v.id+'-load') @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
  Invoke-Native ($v.id+'-check') @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThickClientManagedApplication')
  Invoke-Native ($v.id+'-run') @('ENTERPRISE','/F',('"'+$base+'"'))
  $actual=if(Test-Path -LiteralPath $result){[IO.File]::ReadAllText($result).Trim()}else{'NO_RESULT'}
  if($actual -ne ($v.id+'|PASS|'+$v.expect)){throw ('Значение не подтверждено: '+$v.id)}
  $sha=[Security.Cryptography.SHA256]::Create();$fragmentHash=[BitConverter]::ToString($sha.ComputeHash($enc.GetBytes($v.code))).Replace('-','').ToLowerInvariant();$sha.Dispose()
  $cases.Add([pscustomobject]@{id=$v.id;status='PASS';observed=$v.expect;fragmentSha256=$fragmentHash;source='official-platform-execution';syntaxChecked=$true})
 }
 $report=[pscustomobject]@{status='AUTOMATED PASS';contentRevision='2.0.0-pedagogy.1';platformVersion=(Get-Item -LiteralPath $platform).VersionInfo.ProductVersion;environment='official-platform-local-file-base';trainingBuildTested=$false;licenseProfile='NOT_INSPECTED';licensingCredentialsCollected=$false;nativeUiTested=$false;userWorksUsed=$false;productionUsed=$false;cases=$cases;steps=$steps;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant()}
 $report|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $dest 'PEDAGOGY_NATIVE_RESULT.json') -Encoding UTF8
 Write-Output ('AUTOMATED PASS: '+$cases.Count+' случаев в настоящей 1С '+$report.platformVersion+'; учебная сборка и UI требуют отдельных подтверждений.')
}catch{
 [pscustomobject]@{status='FAILED';steps=$steps;completedCases=$cases;message='Нативная проверка не завершена; полные локальные логи не публикуются.'}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $dest 'PEDAGOGY_NATIVE_RESULT.json') -Encoding UTF8
 throw
}
