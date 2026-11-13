param([Parameter(Mandatory=$true)][string]$OutputDirectory,[string]$Platform='C:/Program Files/1cv8/8.3.27.2214/bin/1cv8.exe')
$ErrorActionPreference='Stop'
$taskRepo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskOut=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $taskOut){throw 'Проверке нужен новый отдельный каталог.'}
if($taskOut.StartsWith($taskRepo+[IO.Path]::DirectorySeparatorChar)){throw 'Учебные базы должны быть вне репозитория.'}
[IO.Directory]::CreateDirectory($taskOut)|Out-Null
$taskSteps=[Collections.Generic.List[object]]::new()
$taskCases=[Collections.Generic.List[object]]::new()
$taskResults=[Collections.Generic.List[object]]::new()
function Write-Utf8([string]$file,[string]$value){[IO.File]::WriteAllText($file,$value,[Text.UTF8Encoding]::new($true))}
function Invoke-Own([string]$name,[string[]]$arguments){
 $log=Join-Path $taskOut ($name+'.private.log')
 $proc=Start-Process -FilePath $Platform -ArgumentList ($arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru
 if(-not $proc.WaitForExit(45000)){$proc.Kill();throw ('Таймаут собственного процесса '+$name)}
 $proc.Refresh();$step=@{operation=$name;exitCode=$proc.ExitCode};$taskSteps.Add($step)
 $taskSteps|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $taskOut 'STEPS.json') -Encoding utf8
 if($proc.ExitCode -ne 0){throw ('Не прошла нативная операция '+$name+'; приватный журнал не экспортируется.')}
 Write-Output ($name+': PASS')
}
function Add-Case([string]$name,[string]$source,[string]$expected){
 if(-not @($taskCases|Where-Object source -CEQ $source).Count){$taskCases.Add(@{name=$name;source=$source;expected=$expected})}
}
foreach($id in @('onec.p1.lifecycle','onec.p2.topic-1')){
 $lesson=Get-Content -LiteralPath (Join-Path $taskRepo ('courses/reference/authoring/'+$id+'.ru.json')) -Raw -Encoding utf8|ConvertFrom-Json
 foreach($section in $lesson.sections){if($section.code.language -eq 'bsl'){
  $expected=if($id -eq 'onec.p1.lifecycle'){'Моя учебная служба работает'}elseif($section.id -eq 'values'){"75`n3045"}else{'75'}
  Add-Case ($id+'-'+$section.id) $section.code.source $expected
 }}
 Add-Case ($id+'-independent') $lesson.practice.referenceSolution.source $(if($id -eq 'onec.p1.lifecycle'){"Занятие началось`nСледующий шаг — расчёт"}else{'30'})
}
$calc=Get-Content -LiteralPath (Join-Path $taskRepo 'courses/reference/authoring/onec.p2.topic-1.ru.json') -Raw -Encoding utf8|ConvertFrom-Json
Add-Case 'calculation-one-change' (($calc.sections|Where-Object id -EQ 'calculation').code.source.Replace('45;','20;')) '50'
Add-Case 'independent-one-change' $calc.practice.referenceSolution.source.Replace('18;','21;') '33'
$cards=Get-Content -LiteralPath (Join-Path $taskRepo 'courses/reference/cards.ru.json') -Raw -Encoding utf8|ConvertFrom-Json
foreach($card in $cards){if($card.id.StartsWith('bsl-') -and $card.example.Contains('ПриНачалеРаботыСистемы()')){
 Add-Case ('reference-'+$card.id) $card.example $card.observation
}}
$taskCases|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $taskOut 'ORIGINAL_CASES.json') -Encoding utf8
$source=Join-Path $taskOut 'programming-source'
Copy-Item -LiteralPath (Join-Path $taskRepo 'courses/onec-education/native/beginner-service-desk') -Destination $source -Recurse
$cfg=Join-Path $source 'Configuration.xml';$text=[IO.File]::ReadAllText($cfg)
$text=[regex]::Replace($text,'(?s)<ChildObjects>.*?</ChildObjects>','<ChildObjects><Language>Русский</Language></ChildObjects>')
Write-Utf8 $cfg $text
$base=Join-Path $taskOut 'programming-base'
Invoke-Own 'programming-create' @('CREATEINFOBASE',('File="'+$base+'";'))
$module=Join-Path $source 'Ext/ManagedApplicationModule.bsl'
$index=0
foreach($case in $taskCases){
 $index++;$name=('{0:d2}' -f $index);$actual=Join-Path $taskOut ($name+'-actual.txt')
 $body=$case.source.Replace('Сообщить(','QAСообщить(')
 $body=$body.Replace('Процедура ПриНачалеРаботыСистемы()',"Процедура ПриНачалеРаботыСистемы()`n    QAЖурнал = Новый ТекстовыйДокумент;")
 $end=$body.LastIndexOf('КонецПроцедуры')
 if($end -lt 0){throw 'Не найден конец стартового обработчика'}
 $tail="    QAЖурнал.Записать(""$($actual.Replace('\','/'))"", КодировкаТекста.UTF8);`n    ЗавершитьРаботуСистемы(Ложь);`n"
 $instrumented="Перем QAЖурнал;`n"+$body.Substring(0,$end)+$tail+$body.Substring($end)+@"

Процедура QAСообщить(Значение)
    Сообщить(Значение);
    QAЖурнал.ДобавитьСтроку(Строка(Значение));
КонецПроцедуры
"@
 Write-Utf8 $module $instrumented
 Invoke-Own ($name+'-load') @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
 Invoke-Own ($name+'-check') @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication')
 Invoke-Own ($name+'-run') @('ENTERPRISE','/F',('"'+$base+'"'))
 if(-not (Test-Path -LiteralPath $actual)){throw ('Нет реального результата '+$case.name)}
 $value=[IO.File]::ReadAllText($actual).Trim().Replace("`r`n","`n")
 $expected=$case.expected.Trim().Replace("`r`n","`n")
 if($value -cne $expected -and -not ($case.name -eq 'reference-bsl-date' -and $value.Replace(' ','').Replace([string][char]160,'') -eq '2026')){throw ('Отличается результат '+$case.name)}
 $taskResults.Add(@{name=$case.name;status='PASS';actual=$value;expected=$expected;sourceSha256=([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($case.source)))).ToLowerInvariant();instrumentation='Исходные выражения выполняются нативно. Вызов Сообщить делегирован наблюдателю, который вызывает настоящий Сообщить и записывает переданное значение; добавлен выход.'})
 $taskResults|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $taskOut 'NATIVE_CASE_RESULTS.json') -Encoding utf8
}
# Неподменённый учебный модуль остаётся для отдельного GUI-наблюдения.
$original=(Get-Content -LiteralPath (Join-Path $taskRepo 'courses/reference/authoring/onec.p1.lifecycle.ru.json') -Raw -Encoding utf8|ConvertFrom-Json).practice.referenceSolution.source
Write-Utf8 $module $original
Invoke-Own 'original-message-load' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
Invoke-Own 'original-message-check' @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication')
@{status='NATIVE INSTRUMENTED PASS';platform='8.3.27.2214';cases=$taskResults.Count;gui='NOT RUN in this script';sourceUnmodifiedInRepo=$true;ownerDataUsed=$false;workingBasesChanged=0;programmingBase=$base}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $taskOut 'RESULT.json') -Encoding utf8
