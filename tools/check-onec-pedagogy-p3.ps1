param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$dest=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $dest){throw 'Нужен новый каталог; прежние проверки сохраняются'}
New-Item -ItemType Directory -Path $dest | Out-Null
$enc=[Text.UTF8Encoding]::new($false)
$platform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe'
$code=Join-Path $Repo 'courses\onec-education\code\pedagogy'
$source=Join-Path $dest 'source'
Copy-Item -LiteralPath (Join-Path $Repo 'courses\onec-education\native\beginner-service-desk') -Destination $source -Recurse
$commonSource=Join-Path $code 'common-calculation-first.bsl'
$commonBody=[IO.File]::ReadAllText($commonSource)
$commonXml=[IO.File]::ReadAllText((Join-Path $Repo 'courses\onec-education\native\service-desk-advanced\CommonModules\УчебныеЗадания.xml')).Replace('УчебныеЗадания','УчебныеРасчеты').Replace('1f0db6e0-2d5c-41ed-ae43-0dcc40799bb8','933d7bce-b94b-49a5-a2d2-df27bfe43532').Replace('Оригинальная учебная фоновая операция','Оригинальный учебный расчёт без записи данных')
$commonModule=Join-Path $source 'CommonModules\УчебныеРасчеты\Ext\Module.bsl'
New-Item -ItemType Directory -Path (Split-Path $commonModule -Parent) -Force | Out-Null
[IO.File]::WriteAllText((Join-Path $source 'CommonModules\УчебныеРасчеты.xml'),$commonXml,$enc)
$cfgPath=Join-Path $source 'Configuration.xml'
$cfg=[IO.File]::ReadAllText($cfgPath)
if(-not $cfg.Contains('<ChildObjects>')){throw 'Не найдены дочерние объекты собственной конфигурации'}
[IO.File]::WriteAllText($cfgPath,$cfg.Replace('<ChildObjects>','<ChildObjects><CommonModule>УчебныеРасчеты</CommonModule>'),$enc)
$steps=[Collections.Generic.List[object]]::new();$cases=[Collections.Generic.List[object]]::new();$variants=[Collections.Generic.List[object]]::new()
function Hash-Text([string]$s){$h=[Security.Cryptography.SHA256]::Create();try{([BitConverter]::ToString($h.ComputeHash($enc.GetBytes($s)))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()}}
function Invoke-Own([string]$Name,[string[]]$Arguments,[bool]$ExpectedUnavailable=$false){
 $log=Join-Path $dest ($Name+'.private.log');$p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $p.WaitForExit(45000)){$p.Kill();throw ('Таймаут только своего процесса '+$Name)}
 $p.Refresh();$text=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''}
 $class=if($text -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($text -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'}
 $rejected=($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC')
 $expectedBoundary=$ExpectedUnavailable -and $class -eq 'PLATFORM_DIAGNOSTIC' -and $text -match 'Стоимость|УчебныеРасчеты' -and $text -match 'не обнаружен|не определен|не найд|not found|недоступ'
 $steps.Add([pscustomobject]@{name=$Name;exitCode=$p.ExitCode;classification=$class;expectedBoundaryRejection=$expectedBoundary})
 if($rejected -and -not $expectedBoundary){throw ('Не выполнен '+$Name+'; '+$class)}
 return [pscustomobject]@{rejected=$expectedBoundary}
}
function Add-Case([string]$Id,[string]$Topic,[string]$File,[string]$Body,[bool]$FullModule,[string]$Predicate,[string]$Observation,[string]$Expected,[string]$Reject=''){$variants.Add([pscustomobject]@{id=$Id;topic=$Topic;file=$File;body=$Body;full=$FullModule;predicate=$Predicate;observation=$Observation;expected=$Expected;reject=$Reject})}
$f=[IO.File]::ReadAllText((Join-Path $code 'functions-parameters-first.bsl'))
foreach($n in @(30,45,0)){Add-Case ('P3.FUNCTION.'+$n) 'onec.p3.topic-2' 'functions-parameters-first.bsl' ($f.Replace('Минуты = 30;',('Минуты = '+$n+';'))) $true ('(Результат = '+($n*20)+') И (Минуты = '+$n+')') 'Строка(Результат)' ([string]($n*20))}
Add-Case 'P3.FUNCTION.NEGATIVE' 'onec.p3.topic-2' 'functions-parameters-first.bsl' ($f.Replace('Минуты = 30;','Минуты = -1;')) $true '' '' 'REJECTED' 'exception'
$a=[IO.File]::ReadAllText((Join-Path $code 'collections-first.bsl'))
Add-Case 'P3.COLLECTION.75' 'onec.p3.topic-3' 'collections-first.bsl' $a $false '(Результат = 75) И (Карточка.Минуты = 75) И (Итоги.Получить("Клиент-А") = 75) И (МинутыЗаявок[0] = 30)' 'Строка(Результат)' '75'
Add-Case 'P3.COLLECTION.90' 'onec.p3.topic-3' 'collections-first.bsl' ($a.Replace('Результат = 0;','МинутыЗаявок.Добавить(15);'+[Environment]::NewLine+'Результат = 0;')) $false 'Результат = 90' 'Строка(Результат)' '90'
$empty=$a.Replace('МинутыЗаявок.Добавить(30);','').Replace('МинутыЗаявок.Добавить(45);','').Replace('Сообщить(МинутыЗаявок[0]);','')
Add-Case 'P3.COLLECTION.EMPTY' 'onec.p3.topic-3' 'collections-first.bsl' $empty $false '(Результат = 0) И (МинутыЗаявок.Количество() = 0)' 'Строка(Результат)' '0'
$missing=$a+[Environment]::NewLine+'Итоги.Вставить("Нулевой", 0);'
Add-Case 'P3.COLLECTION.MISSING' 'onec.p3.topic-3' 'collections-first.bsl' $missing $false '(Итоги.Получить("Нулевой") = 0) И (Итоги.Получить("НетТакого") = Неопределено)' '"DISTINCT"' 'DISTINCT'
$alias=$a+[Environment]::NewLine+'ВтороеИмя = МинутыЗаявок; ВтороеИмя.Добавить(15); Копия = Новый Массив; Для Каждого Элемент Из МинутыЗаявок Цикл Копия.Добавить(Элемент); КонецЦикла; Копия.Добавить(5);'
Add-Case 'P3.COLLECTION.ALIAS' 'onec.p3.topic-3' 'collections-first.bsl' $alias $false '(МинутыЗаявок.Количество() = 3) И (ВтороеИмя.Количество() = 3) И (Копия.Количество() = 4)' '"3/3/4"' '3/3/4'
$e=[IO.File]::ReadAllText((Join-Path $code 'exceptions-first.bsl'))
Add-Case 'P3.EXCEPTION.INVALID' 'onec.p3.topic-4' 'exceptions-first.bsl' $e $false 'Результат = Ложь' '?(Результат, "TRUE", "FALSE")' 'FALSE'
foreach($s in @('30','-1')){Add-Case ('P3.EXCEPTION.NUMERIC.'+$s) 'onec.p3.topic-4' 'exceptions-first.bsl' ($e.Replace('"ошибка"',('"'+$s+'"'))) $false 'Результат = Истина' '?(Результат, "TRUE", "FALSE")' 'TRUE'}
$t=[IO.File]::ReadAllText((Join-Path $code 'function-contracts-first.bsl'))
Add-Case 'P3.CONTRACT.POSITIVE' 'onec.p3.module-tests' 'function-contracts-first.bsl' $t $true 'Результат = 4' 'Строка(Результат)' '4'
Add-Case 'P3.CONTRACT.MUTATION' 'onec.p3.module-tests' 'function-contracts-first.bsl' ($t.Replace('/ 60, 2)','/ 30, 2)')) $true '' '' 'REJECTED' 'exception'
$c=[IO.File]::ReadAllText((Join-Path $code 'common-calculation-caller.bsl'))
Add-Case 'P3.CONTEXT.600' 'onec.p3.topic-1' 'common-calculation-caller.bsl' $c $true 'Результат = 600' 'Строка(Результат)' '600'
Add-Case 'P3.CONTEXT.900' 'onec.p3.topic-1' 'common-calculation-caller.bsl' ($c.Replace('(30, 1200)','(45, 1200)')) $true 'Результат = 900' 'Строка(Результат)' '900'
Add-Case 'P3.CONTEXT.NOEXPORT' 'onec.p3.topic-1' 'common-calculation-caller.bsl' $c $true '' '' 'REJECTED' 'noexport'
$base=Join-Path $dest 'test-base'
$null=Invoke-Own 'create' @('CREATEINFOBASE',('File="'+$base+'";'))
foreach($v in $variants){
 $resultFile=Join-Path $dest ($v.id+'.result.txt')
 $body=$v.body
 $observer=@"
    НексусУспех = $($v.predicate);
    НексусПротокол = Новый ТекстовыйДокумент;
    НексусПротокол.УстановитьТекст(?(НексусУспех, "PASS|", "FAIL|") + $($v.observation));
    НексусПротокол.Записать("$resultFile", КодировкаТекста.UTF8);
    ЗавершитьРаботуСистемы(Ложь);
"@
 if($v.reject){
  $expectedError=switch($v.id){'P3.FUNCTION.NEGATIVE'{'Минуты и тариф не могут быть отрицательными'}'P3.CONTRACT.MUTATION'{'Не пройдено: полчаса'}'P3.CONTEXT.NOEXPORT'{'Метод объекта не обнаружен (Стоимость)'}default{throw 'Не задана ожидаемая причина отказа'}}
  $body=$body.Replace('Процедура ПриНачалеРаботыСистемы()','Процедура НексусУчебныйЗапуск()')
  $body+=[Environment]::NewLine+@"
Процедура ПриНачалеРаботыСистемы()
    НексусОтказ = Ложь;
    Попытка
        НексусУчебныйЗапуск();
    Исключение
        НексусОписание = ОписаниеОшибки();
        НексусОтказ = СтрНайти(НексусОписание, "$expectedError") > 0;
    КонецПопытки;
    НексусПротокол = Новый ТекстовыйДокумент;
    НексусПротокол.УстановитьТекст(?(НексусОтказ, "PASS|REJECTED", "FAIL|ACCEPTED"));
    НексусПротокол.Записать("$resultFile", КодировкаТекста.UTF8);
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
"@
 }elseif($v.full){$at=$body.LastIndexOf('КонецПроцедуры');if($at -lt 0){throw 'Нет обработчика для наблюдателя'};$body=$body.Insert($at,$observer+[Environment]::NewLine)
 }else{$body='Процедура ПриНачалеРаботыСистемы()'+[Environment]::NewLine+$body+[Environment]::NewLine+$observer+[Environment]::NewLine+'КонецПроцедуры'}
 [IO.File]::WriteAllText((Join-Path $source 'Ext\ManagedApplicationModule.bsl'),$body,$enc)
 $common=if($v.reject -eq 'noexport'){$commonBody.Replace(') Экспорт',')')}else{$commonBody}
 [IO.File]::WriteAllText($commonModule,$common,$enc)
 $unavailable=$v.reject -eq 'noexport'
 $load=Invoke-Own ($v.id+'-load') @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg') $unavailable
 $check=if($load.rejected){$load}else{Invoke-Own ($v.id+'-check') @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity') $unavailable}
 $phase='execution'
 if($check.rejected){$phase='native-context-check';$observed='PASS|REJECTED'}else{
  $null=Invoke-Own ($v.id+'-run') @('ENTERPRISE','/F',('"'+$base+'"'))
  $observed=if(Test-Path -LiteralPath $resultFile){[IO.File]::ReadAllText($resultFile).Trim().TrimStart([char]0xFEFF)}else{'NO_RESULT'}
 }
 if($observed -ne ('PASS|'+$v.expected)){throw ('Не подтверждён '+$v.id)}
 $cases.Add([pscustomobject]@{id=$v.id;topicId=$v.topic;sourceFile=('courses/onec-education/code/pedagogy/'+$v.file);originalSourceSha256=(Get-FileHash -LiteralPath (Join-Path $code $v.file) -Algorithm SHA256).Hash.ToLowerInvariant();executedFragmentSha256=(Hash-Text $v.body);commonModuleSourceSha256=(Get-FileHash -LiteralPath $commonSource -Algorithm SHA256).Hash.ToLowerInvariant();commonModuleExecutedSha256=(Hash-Text $common);observed=$observed;rejectionPhase=$phase;expectedRejection=[bool]$v.reject;rejectionReasonChecked=[bool]$v.reject;assertionAccepted=(-not [bool]$v.reject);status='PASS'})
}
$record=[ordered]@{schemaVersion=1;status='AUTOMATED PASS';contentRevision='2.0.0-pedagogy.1';platformVersion='8.3.27.2214';environment='official-installed-local-platform';training1508Verified=$false;codeVerifiedServer=$false;progressWritten=$false;onlyOwnSyntheticInfobase=$true;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();cases=$cases;steps=$steps}
[IO.File]::WriteAllText((Join-Path $dest 'PEDAGOGY_P3_RESULT.json'),($record|ConvertTo-Json -Depth 9),$enc)
Write-Output ([pscustomobject]@{status=$record.status;cases=$cases.Count;expectedRejections=@($cases|Where-Object expectedRejection).Count}|ConvertTo-Json -Compress)
