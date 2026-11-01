param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$platform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe'
if(-not(Test-Path -LiteralPath $platform -PathType Leaf)){throw 'Официальная платформа отсутствует'}
$dest=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $dest){throw 'Нужен новый каталог, прежние попытки сохраняются'}
New-Item -ItemType Directory -Path $dest | Out-Null
$steps=[Collections.Generic.List[object]]::new();$cases=[Collections.Generic.List[object]]::new();$variants=[Collections.Generic.List[object]]::new();$enc=[Text.UTF8Encoding]::new($false)
function Hash-Text([string]$Text){$h=[Security.Cryptography.SHA256]::Create();try{([BitConverter]::ToString($h.ComputeHash($enc.GetBytes($Text)))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()}}
function Invoke-Own([string]$Name,[string[]]$Arguments){
 $log=Join-Path $dest ($Name+'.private.log');$p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(45000)){$p.Kill();throw ('Таймаут своего процесса '+$Name)}
 $text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''};$class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'}
 $steps.Add([pscustomobject]@{name=$Name;exitCode=$p.ExitCode;classification=$class});if($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name+'; '+$class)}
}
function Add-Variant([string]$Id,[string]$Topic,[string]$File,[string]$Body,[string]$Predicate,[string]$Observed,[string]$Expected,[bool]$Reject=$false){$variants.Add([pscustomobject]@{id=$Id;topicId=$Topic;file=$File;body=$Body;predicate=$Predicate;observed=$Observed;expected=$Expected;expectedRejection=$Reject})}
$code=Join-Path $Repo 'courses\onec-education\code\pedagogy'
$types=[IO.File]::ReadAllText((Join-Path $code 'types-and-conversion.bsl'))
Add-Variant 'P2.TYPE.30' 'onec.p2.topic-2' 'types-and-conversion.bsl' $types '(ТипЗнч(ТекстМинут) = Тип("Строка")) И (ТипЗнч(Минуты) = Тип("Число")) И (ПреобразованныеМинуты + 15 = 45)' 'Строка(ПреобразованныеМинуты + 15)' '45'
Add-Variant 'P2.TYPE.20' 'onec.p2.topic-2' 'types-and-conversion.bsl' ($types.Replace('"30"','"20"')) '(ТипЗнч(ТекстМинут) = Тип("Строка")) И (ПреобразованныеМинуты + 15 = 35)' 'Строка(ПреобразованныеМинуты + 15)' '35'
$conditions=[IO.File]::ReadAllText((Join-Path $code 'conditions-first.bsl'))
foreach($row in @(@(-1,'Недопустимо'),@(0,'Без затрат'),@(1,'Короткая'),@(60,'Короткая'),@(61,'Длинная'),@(1440,'Длинная'),@(1441,'Недопустимо'))){$n=[int]$row[0];$value=[string]$row[1];Add-Variant ('P2.IF.'+$n) 'onec.p2.topic-3' 'conditions-first.bsl' ($conditions.Replace('Минуты = 0;',('Минуты = '+$n+';'))) ('Класс = "'+$value+'"') 'Класс' $value}
$loops=[IO.File]::ReadAllText((Join-Path $code 'loops-first.bsl'))
foreach($n in @(3,4,0)){Add-Variant ('P2.LOOP.'+$n) 'onec.p2.topic-4' 'loops-first.bsl' ($loops.Replace('По 3 Цикл',('По '+$n+' Цикл'))) ('ВсегоМинут = '+($n*15)) 'Строка(ВсегоМинут)' ([string]($n*15))}
$bad=$loops.Replace('    ВсегоМинут = ВсегоМинут + 15;','    ВсегоМинут = 0;'+[Environment]::NewLine+'    ВсегоМинут = ВсегоМинут + 15;')
Add-Variant 'P2.LOOP.RESET.REJECTED' 'onec.p2.topic-4' 'loops-first.bsl' $bad 'ВсегоМинут = 45' 'Строка(ВсегоМинут)' '15' $true
$dates=[IO.File]::ReadAllText((Join-Path $code 'numbers-dates-first.bsl'))
foreach($row in @(@(60,'Начало + 60'),@(900,'Начало + 15 * 60'))){$n=[int]$row[0];Add-Variant ('P2.DATE.'+$n) 'onec.p2.numbers-dates-locales' 'numbers-dates-first.bsl' ($dates.Replace('Начало + 60',[string]$row[1])) ('(Представление = "12.50") И (РазностьСекунд = '+$n+')') 'Строка(РазностьСекунд)' ([string]$n)}
$source=Join-Path $dest 'source';Copy-Item -LiteralPath (Join-Path $Repo 'courses\onec-education\native\beginner-service-desk') -Destination $source -Recurse
$base=Join-Path $dest 'test-base';Invoke-Own 'create-base' @('CREATEINFOBASE',('File="'+$base+'";'))
foreach($v in $variants){
 $result=Join-Path $dest ($v.id+'.result.txt');$resultLiteral=$result.Replace('"','""');$body='Процедура ПриНачалеРаботыСистемы()'+[Environment]::NewLine+$v.body+[Environment]::NewLine+@"
    Если $($v.predicate) Тогда
        НексусИтог = "PASS";
    Иначе
        НексусИтог = "FAIL";
    КонецЕсли;
    НексусПротокол = Новый ТекстовыйДокумент;
    НексусПротокол.УстановитьТекст(НексусИтог + "|" + $($v.observed));
    НексусПротокол.Записать("$resultLiteral", КодировкаТекста.UTF8);
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
"@
 [IO.File]::WriteAllText((Join-Path $source 'Ext\ManagedApplicationModule.bsl'),$body,$enc)
 Invoke-Own ($v.id+'-load') @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
 Invoke-Own ($v.id+'-check') @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
 Invoke-Own ($v.id+'-run') @('ENTERPRISE','/F',('"'+$base+'"'))
 $observed=[IO.File]::ReadAllText($result).Trim().TrimStart([char]0xFEFF);$expectedStatus=if($v.expectedRejection){'FAIL'}else{'PASS'}
 if($observed -ne ($expectedStatus+'|'+$v.expected)){throw ('Не совпал контроль '+$v.id)}
 $cases.Add([pscustomobject]@{id=$v.id;topicId=$v.topicId;sourceFile=('courses/onec-education/code/pedagogy/'+$v.file);originalSourceSha256=(Get-FileHash -LiteralPath (Join-Path $code $v.file) -Algorithm SHA256).Hash.ToLowerInvariant();executedFragmentSha256=(Hash-Text $v.body);expected=$v.expected;observed=$observed;assertionAccepted=(-not $v.expectedRejection);expectedRejection=$v.expectedRejection;status='PASS'})
}
$record=[ordered]@{schemaVersion=1;status='AUTOMATED PASS';contentRevision='2.0.0-pedagogy.1';environment='official-installed-local-platform';platformVersion='8.3.27.2214';training1508Verified=$false;codeVerifiedServer=$false;credentialEligible=$false;progressWritten=$false;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();cases=$cases;steps=$steps}
[IO.File]::WriteAllText((Join-Path $dest 'PEDAGOGY_LANGUAGE_RESULT.json'),($record|ConvertTo-Json -Depth 9),$enc)
Write-Output ([pscustomobject]@{status=$record.status;cases=$cases.Count;rejectedMutations=@($cases|Where-Object expectedRejection).Count;platformVersion=$record.platformVersion}|ConvertTo-Json -Compress)
