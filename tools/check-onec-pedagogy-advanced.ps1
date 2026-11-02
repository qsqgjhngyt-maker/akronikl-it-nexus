param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory,[string]$SourceDirectory,[string]$PlatformPath)
$ErrorActionPreference='Stop';$enc=[Text.UTF8Encoding]::new($false);$Repo=[IO.Path]::GetFullPath($Repo)
$code=if($SourceDirectory){[IO.Path]::GetFullPath($SourceDirectory)}else{Join-Path $Repo 'courses\onec-education\code\pedagogy'}
$dest=[IO.Path]::GetFullPath($OutputDirectory);if(Test-Path -LiteralPath $dest){throw 'Нужна новая папка проверки'};New-Item -ItemType Directory -Path $dest|Out-Null
$fixturePath=Join-Path $Repo 'courses\onec-education\native\service-desk-professional-v2'
$fixtureFiles=@(Get-ChildItem -LiteralPath $fixturePath -Recurse -File|ForEach-Object{[pscustomobject]@{path=$_.FullName.Substring($fixturePath.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}})
$source=Join-Path $dest 'source';Copy-Item -LiteralPath $fixturePath -Destination $source -Recurse
$platform=if($PlatformPath){[IO.Path]::GetFullPath($PlatformPath)}else{'C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe'};$steps=[Collections.Generic.List[object]]::new();$cases=[Collections.Generic.List[object]]::new()
function Invoke-Own([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log');$p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(45000)){$p.Kill();throw 'Таймаут собственного процесса'};$p.Refresh();$text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'};$steps.Add([pscustomobject]@{name=$Name;exitCode=$p.ExitCode;classification=$class});if($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name)}
}
function Hash-Text([string]$s){$h=[Security.Cryptography.SHA256]::Create();try{([BitConverter]::ToString($h.ComputeHash($enc.GetBytes($s)))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()}}
$xml=[IO.File]::ReadAllText((Join-Path $Repo 'courses\onec-education\native\service-desk-advanced\CommonModules\УчебныеЗадания.xml')).Replace('УчебныеЗадания','УчебныеПрофессиональныеОпыты').Replace('1f0db6e0-2d5c-41ed-ae43-0dcc40799bb8','2bf1cc3d-258b-498c-8fe7-f8cf5f1a8907').Replace('Оригинальная учебная фоновая операция','Оригинальные учебные опыты документа и транзакций в отдельной базе')
$commonPath=Join-Path $source 'CommonModules\УчебныеПрофессиональныеОпыты\Ext\Module.bsl';New-Item -ItemType Directory -Path (Split-Path $commonPath -Parent) -Force|Out-Null
[IO.File]::WriteAllText((Join-Path $source 'CommonModules\УчебныеПрофессиональныеОпыты.xml'),$xml,$enc)
$cfg=Join-Path $source 'Configuration.xml';[IO.File]::WriteAllText($cfg,[IO.File]::ReadAllText($cfg).Replace('<ChildObjects>','<ChildObjects><CommonModule>УчебныеПрофессиональныеОпыты</CommonModule>'),$enc)
$definitions=@(
 [pscustomobject]@{file='report-dcs-first.bsl';key='dcs';topic='onec.p9.topic-1';call='ОпытКомпоновки';predicate='Результат.ПолныйВерный И Результат.ОтборВерный';from='ОтборМинут.ПравоеЗначение = 30;';to='ОтборМинут.ПравоеЗначение = 45;'},
 [pscustomobject]@{file='exchange-schema-first.bsl';key='schema';topic='onec.p11.topic-2';call='ОпытJSONXML';predicate='Результат.JSONВерный И Результат.ТипОтклонен И Результат.XMLВерный';from='Повтор.minutes = 30';to='Повтор.minutes = 31'},
 [pscustomobject]@{file='reliability-lock-first.bsl';key='locks';topic='onec.p10.topic-1';call='ОпытЛокальнойБлокировки';predicate='Результат.ОткатСохранил И Результат.ДругойСохранен';from='Объект.Записать(); ОтменитьТранзакцию();';to='Объект.Записать(); ЗафиксироватьТранзакцию();'},
 [pscustomobject]@{file='job-batch-first.bsl';key='jobs';topic='onec.p11.topic-4';call='ОпытРучногоОбработчика';predicate='Результат.ГраницыВерны И Результат.НольОтклонен';from='Мин(Позиция + Размер,Всего)';to='Мин(Позиция + Размер,Всего - 1)'}
)
$base=Join-Path $dest 'test-base';Invoke-Own 'create' @('CREATEINFOBASE',('File="'+$base+'";'))
foreach($d in $definitions){foreach($bad in @($false,$true)){
 $file=$d.file;$original=[IO.File]::ReadAllText((Join-Path $code $file));if(-not $original.Contains($d.from)){throw 'Не найдена точная мутация собственного фрагмента'};$body=if($bad){$original.Replace($d.from,$d.to)}else{$original};[IO.File]::WriteAllText($commonPath,$body,$enc)
 $id='CURRENT.'+$d.key.ToUpperInvariant()+$(if($bad){'.MUTATION'}else{'.ORIGINAL'});$resultFile=Join-Path $dest ($id+'.txt')
 $startup=@"
Процедура ПриНачалеРаботыСистемы()
    Результат = УчебныеПрофессиональныеОпыты.$($d.call)();
    Успех = $($d.predicate);
    Протокол = Новый ТекстовыйДокумент;
    Протокол.УстановитьТекст(?(Успех, "PASS", "FAIL"));
    Протокол.Записать("$resultFile",КодировкаТекста.UTF8);
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
"@
 [IO.File]::WriteAllText((Join-Path $source 'Ext\ManagedApplicationModule.bsl'),$startup,$enc)
 Invoke-Own ($id+'-load') @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
 Invoke-Own ($id+'-check') @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
 Invoke-Own ($id+'-run') @('ENTERPRISE','/F',('"'+$base+'"'))
 $observed=if(Test-Path -LiteralPath $resultFile){[IO.File]::ReadAllText($resultFile).Trim()}else{'NO_RESULT'};$expected=if($bad){'FAIL'}else{'PASS'};if($observed -ne $expected){throw ('Не различён '+$id)}
 $cases.Add([pscustomobject]@{id=$id;topicId=$d.topic;sourceFile=('courses/onec-education/code/pedagogy/'+$file);originalSourceSha256=(Get-FileHash -LiteralPath (Join-Path $code $file) -Algorithm SHA256).Hash.ToLowerInvariant();executedSourceSha256=(Hash-Text $body);observed=$observed;expected=$expected;expectedSemanticRejection=$bad;assertionAccepted=(-not $bad);syntaxAndContextsPassed=$true;status='PASS'})
}}
$r=[ordered]@{schemaVersion=1;status='AUTOMATED PASS';platformVersion=(Get-Item -LiteralPath $platform).VersionInfo.ProductVersion;scope='Original server common-module functions called by a real managed application; own separate synthetic infobase';onlyOwnSyntheticInfobase=$true;training1508Verified=($platform -match "1508");realAccountUsed=$false;progressWritten=$false;codeVerifiedServer=$false;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();commonModuleMetadataSha256=(Hash-Text $xml);cases=$cases;steps=$steps}
$r['fixture']=$fixtureFiles
[IO.File]::WriteAllText((Join-Path $dest 'PEDAGOGY_ADVANCED_RESULT.json'),($r|ConvertTo-Json -Depth 8),$enc)
Write-Output ([pscustomobject]@{status=$r.status;cases=$cases.Count;semanticMutationsRejected=@($cases|Where-Object expectedSemanticRejection).Count}|ConvertTo-Json -Compress)
