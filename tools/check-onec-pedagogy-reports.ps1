param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory,[string]$SourceDirectory)
$ErrorActionPreference='Stop';$enc=[Text.UTF8Encoding]::new($false);$Repo=[IO.Path]::GetFullPath($Repo)
$code=if($SourceDirectory){[IO.Path]::GetFullPath($SourceDirectory)}else{Join-Path $Repo 'courses\onec-education\code\pedagogy'}
$dest=[IO.Path]::GetFullPath($OutputDirectory);if(Test-Path -LiteralPath $dest){throw 'Нужна новая папка проверки'};New-Item -ItemType Directory -Path $dest|Out-Null
$source=Join-Path $dest 'source';Copy-Item -LiteralPath (Join-Path $Repo 'courses\onec-education\native\service-desk-teaching-v2') -Destination $source -Recurse
$platform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe';$steps=[Collections.Generic.List[object]]::new();$cases=[Collections.Generic.List[object]]::new()
function Invoke-Own([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log');$p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(45000)){$p.Kill();throw 'Таймаут собственного процесса'};$p.Refresh();$text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'};$steps.Add([pscustomobject]@{name=$Name;exitCode=$p.ExitCode;classification=$class});if($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name)}
}
function Hash-Text([string]$s){$h=[Security.Cryptography.SHA256]::Create();try{([BitConverter]::ToString($h.ComputeHash($enc.GetBytes($s)))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()}}
$xml=[IO.File]::ReadAllText((Join-Path $Repo 'courses\onec-education\native\service-desk-advanced\CommonModules\УчебныеЗадания.xml')).Replace('УчебныеЗадания','УчебныеОтчёты').Replace('1f0db6e0-2d5c-41ed-ae43-0dcc40799bb8','23eb98f7-90af-4ddc-a7a7-3a69e7321c90').Replace('Оригинальная учебная фоновая операция','Оригинальные учебные опыты идентичности в отдельной базе')
$commonPath=Join-Path $source 'CommonModules\УчебныеОтчёты\Ext\Module.bsl';New-Item -ItemType Directory -Path (Split-Path $commonPath -Parent) -Force|Out-Null
[IO.File]::WriteAllText((Join-Path $source 'CommonModules\УчебныеОтчёты.xml'),$xml,$enc)
$cfg=Join-Path $source 'Configuration.xml';[IO.File]::WriteAllText($cfg,[IO.File]::ReadAllText($cfg).Replace('<ChildObjects>','<ChildObjects><CommonModule>УчебныеОтчёты</CommonModule>'),$enc)
$definitions=@(
 [pscustomobject]@{key='control';topic='1c-enterprise.a7.topic-1';call='ОпытОтбораОтчёта';predicate='Результат.ВсеЧислаВерны И Результат.ОдинаковоеИмяНеСсылка';from='З.Клиент = &Клиент';to='З.Клиент <> &Клиент'}
)
foreach($d in $definitions){foreach($bad in @($false,$true)){
 $file='report-'+$d.key+'-first.bsl';$original=[IO.File]::ReadAllText((Join-Path $code $file));if(-not $original.Contains($d.from)){throw 'Не найдена точная мутация собственного фрагмента'};$body=if($bad){$original.Replace($d.from,$d.to)}else{$original};[IO.File]::WriteAllText($commonPath,$body,$enc)
 $id='A7.'+$d.key.ToUpperInvariant()+$(if($bad){'.MUTATION'}else{'.ORIGINAL'});$resultFile=Join-Path $dest ($id+'.txt')
 $base=Join-Path $dest $id;Invoke-Own ($id+'-create') @('CREATEINFOBASE',('File="'+$base+'";'))
 $startup=@"
Процедура ПриНачалеРаботыСистемы()
    Результат = УчебныеОтчёты.$($d.call)();
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
$r=[ordered]@{schemaVersion=1;status='AUTOMATED PASS';platformVersion='8.3.27.2214';scope='Original server common-module functions called by a real managed application; own separate synthetic infobase';onlyOwnSyntheticInfobase=$true;training1508Verified=$false;realAccountUsed=$false;progressWritten=$false;codeVerifiedServer=$false;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();commonModuleMetadataSha256=(Hash-Text $xml);cases=$cases;steps=$steps}
[IO.File]::WriteAllText((Join-Path $dest 'A7_REPORT_QUERY_RESULT.json'),($r|ConvertTo-Json -Depth 8),$enc)
Write-Output ([pscustomobject]@{status=$r.status;cases=$cases.Count;semanticMutationsRejected=@($cases|Where-Object expectedSemanticRejection).Count}|ConvertTo-Json -Compress)
