param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory,[string]$SourceDirectory)
$ErrorActionPreference='Stop';$enc=[Text.UTF8Encoding]::new($false)
$code=if($SourceDirectory){[IO.Path]::GetFullPath($SourceDirectory)}else{Join-Path $Repo 'courses\onec-education\code\pedagogy'}
$dest=[IO.Path]::GetFullPath($OutputDirectory);if(Test-Path -LiteralPath $dest){throw 'Нужна новая папка проверки'};New-Item -ItemType Directory -Path $dest|Out-Null
$source=Join-Path $dest 'source';Copy-Item -LiteralPath (Join-Path $Repo 'courses\onec-education\native\beginner-service-desk') -Destination $source -Recurse
$platform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe';$steps=[Collections.Generic.List[object]]::new();$cases=[Collections.Generic.List[object]]::new()
function Invoke-Own([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log');$p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(45000)){$p.Kill();throw 'Таймаут собственного процесса'};$p.Refresh();$text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'};$steps.Add([pscustomobject]@{name=$Name;exitCode=$p.ExitCode;classification=$class});if($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name)}
}
function Hash-Text([string]$s){$h=[Security.Cryptography.SHA256]::Create();try{([BitConverter]::ToString($h.ComputeHash($enc.GetBytes($s)))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()}}
$xml=[IO.File]::ReadAllText((Join-Path $Repo 'courses\onec-education\native\service-desk-advanced\CommonModules\УчебныеЗадания.xml')).Replace('УчебныеЗадания','УчебныеДанные').Replace('1f0db6e0-2d5c-41ed-ae43-0dcc40799bb8','b56a4cb4-16be-4e48-a878-8476497ad7c2').Replace('Оригинальная учебная фоновая операция','Оригинальные учебные опыты идентичности в отдельной базе')
$commonPath=Join-Path $source 'CommonModules\УчебныеДанные\Ext\Module.bsl';New-Item -ItemType Directory -Path (Split-Path $commonPath -Parent) -Force|Out-Null
[IO.File]::WriteAllText((Join-Path $source 'CommonModules\УчебныеДанные.xml'),$xml,$enc)
$cfg=Join-Path $source 'Configuration.xml';[IO.File]::WriteAllText($cfg,[IO.File]::ReadAllText($cfg).Replace('<ChildObjects>','<ChildObjects><CommonModule>УчебныеДанные</CommonModule>'),$enc)
$definitions=@(
 [pscustomobject]@{key='identity';topic='onec.p4.topic-1';call='ОпытИдентичности';predicate='Результат.ПереименованиеСохранилоСсылку И Результат.ОдинаковыеИменаРазныеСсылки';from='Клиент.Наименование = "Учебная идентичность — после";';to='Клиент = Справочники.Клиенты.СоздатьЭлемент(); Клиент.Наименование = "Учебная идентичность — после";'},
 [pscustomobject]@{key='reference';topic='onec.p4.topic-2';call='ОпытСвязаннойЗаявки';predicate='Результат.СвязьСохранена И Результат.МинутыСохранены И Результат.ТекущееИмя = "Учебная связь — после"';from='Заявка.ДлительностьМинут = 30;';to='Заявка.ДлительностьМинут = 31;'},
 [pscustomobject]@{key='types';topic='onec.p4.topic-3';call='ОпытТиповМетаданных';predicate='Результат.КлиентСсылка И Результат.МинутыЧисло И Результат.СтатусПеречисление И Результат.СтрокаНеСтатус';from='ТипМинут.СодержитТип(Тип("Число"))';to='ТипМинут.СодержитТип(Тип("Строка"))'},
 [pscustomobject]@{key='api';topic='onec.p4.topic-4';call='ОпытМенеджераОбъектаВыборки';predicate='Результат.ДоЗаписиНеИзменилось И Результат.ПослеЗаписиИзменилось И Результат.НайденВыборкой';from='Черновик.Записать();';to='// Намеренно пропущена запись черновика.'}
)
$definitions=@($definitions|Where-Object key -eq 'identity')
$base=Join-Path $dest 'test-base';Invoke-Own 'create' @('CREATEINFOBASE',('File="'+$base+'";'))
foreach($d in $definitions){foreach($bad in @($false,$true)){
 $file='metadata-'+$d.key+'-first.bsl';$original=[IO.File]::ReadAllText((Join-Path $code $file));if(-not $original.Contains($d.from)){throw 'Не найдена точная мутация собственного фрагмента'};$body=if($bad){$original.Replace($d.from,$d.to)}else{$original};[IO.File]::WriteAllText($commonPath,$body,$enc)
 $id='P4.'+$d.key.ToUpperInvariant()+$(if($bad){'.MUTATION'}else{'.ORIGINAL'});$resultFile=Join-Path $dest ($id+'.txt')
 $startup=@"
Процедура ПриНачалеРаботыСистемы()
    Результат = УчебныеДанные.$($d.call)();
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
[IO.File]::WriteAllText((Join-Path $dest 'PEDAGOGY_IDENTITY_RESULT.json'),($r|ConvertTo-Json -Depth 8),$enc)
Write-Output ([pscustomobject]@{status=$r.status;cases=$cases.Count;semanticMutationsRejected=@($cases|Where-Object expectedSemanticRejection).Count}|ConvertTo-Json -Compress)
