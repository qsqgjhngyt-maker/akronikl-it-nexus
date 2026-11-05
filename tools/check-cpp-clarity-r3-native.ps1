param([Parameter(Mandatory=$true)][string]$Repo,[Parameter(Mandatory=$true)][string]$Review,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop';$enc=[Text.UTF8Encoding]::new($false)
$dest=[IO.Path]::GetFullPath($OutputDirectory);if(Test-Path -LiteralPath $dest){throw 'Нужна новая папка проверки'};New-Item -ItemType Directory -Path $dest|Out-Null
$platform='C:\Program Files\1cv8\8.3.27.2214\bin\1cv8.exe';$steps=[Collections.Generic.List[object]]::new();$cases=[Collections.Generic.List[object]]::new()
function Invoke-Own([string]$Name,[string[]]$Arguments){$log=Join-Path $dest ($Name+'.private.log');$p=Start-Process -FilePath $platform -ArgumentList ($Arguments+@('/DisableStartupDialogs','/DisableStartupMessages','/Out',('"'+$log+'"'))) -WindowStyle Hidden -PassThru;if(-not $p.WaitForExit(45000)){$p.Kill();throw ('Таймаут собственного процесса '+$Name)};$p.Refresh();$t=if(Test-Path -LiteralPath $log){[IO.File]::ReadAllText($log)}else{''};$class=if($t -match 'лиценз|license'){'LICENSING_MESSAGE_NOT_EXPORTED'}elseif($t -match 'Ошибк|Error|Синтакс|МодульУправляемогоПриложения\('){'PLATFORM_DIAGNOSTIC'}else{'OPERATION_LOG'};$steps.Add(@{name=$Name;exitCode=$p.ExitCode;classification=$class});if($p.ExitCode -ne 0 -or $class -eq 'PLATFORM_DIAGNOSTIC'){throw ('Не выполнен '+$Name)}}
function Save([string]$p,[string]$t){[IO.File]::WriteAllText($p,$t,$enc)}
$source=Join-Path $dest 'source';Copy-Item -LiteralPath (Join-Path $Repo 'courses\onec-education\native\service-desk-professional-v2') -Destination $source -Recurse
$xml=[IO.File]::ReadAllText((Join-Path $Repo 'courses\onec-education\native\service-desk-advanced\CommonModules\УчебныеЗадания.xml')).Replace('УчебныеЗадания','УчебныеСоединенияR3').Replace('1f0db6e0-2d5c-41ed-ae43-0dcc40799bb8','d564fda7-756b-4fb2-8d3a-3dca7389e61a')
$common=Join-Path $source 'CommonModules\УчебныеСоединенияR3\Ext\Module.bsl';New-Item -ItemType Directory -Path (Split-Path $common -Parent) -Force|Out-Null
Save (Join-Path $source 'CommonModules\УчебныеСоединенияR3.xml') $xml
$cfg=Join-Path $source 'Configuration.xml';Save $cfg ([IO.File]::ReadAllText($cfg).Replace('<ChildObjects>','<ChildObjects><CommonModule>УчебныеСоединенияR3</CommonModule>'))
Copy-Item -LiteralPath (Join-Path $Review 'code\УчебныеСоединенияR3.bsl') -Destination $common
$base=Join-Path $dest 'test-base';$module=Join-Path $source 'Ext\ManagedApplicationModule.bsl';Invoke-Own 'create' @('CREATEINFOBASE',('File="'+$base+'";'))
function Execute([string]$id,[string]$body){Save $module $body;Invoke-Own ($id+'-load') @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg');Invoke-Own ($id+'-check') @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity');Invoke-Own ($id+'-run') @('ENTERPRISE','/F',('"'+$base+'"'))}
$programs=([IO.File]::ReadAllText((Join-Path $Review 'lessons\onec.p2.topic-1.ru.json'))|ConvertFrom-Json).nativePrograms
foreach($v in $programs){$result=Join-Path $dest ($v.name+'.txt');$tail=@"
    Протокол = Новый ТекстовыйДокумент;
    Протокол.УстановитьТекст(Строка(ВсегоМинут));
    Протокол.Записать("$result", КодировкаТекста.UTF8);
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
"@;Execute $v.name ($v.source.Replace('КонецПроцедуры',$tail));$actual=[IO.File]::ReadAllText($result).Trim();if($actual -ne [string]$v.value){throw ('Не совпал '+$v.name)};$cases.Add(@{name=$v.name;observed=$actual;expected=[string]$v.value;status='PASS'})}
# Проверка исходного модуля приложения без инструментирования.
Save $module ([IO.File]::ReadAllText((Join-Path $Review 'code\МодульПриложенияСоединения.bsl')))
Invoke-Own 'original-application-load' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
Invoke-Own 'original-application-check' @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
foreach($v in @(@{id='join-75';a=30;b=45;name='Сервис';total=75},@{id='join-30';a=10;b=20;name='Мастерская';total=30},@{id='join-35';a=15;b=20;name='Мастерская';total=35})){
$result=Join-Path $dest ($v.id+'.txt')
$body=@"
Процедура ПриНачалеРаботыСистемы()
    Данные = УчебныеСоединенияR3.ПодготовитьНабор($($v.a), $($v.b), "$($v.name)");
    Строки = УчебныеСоединенияR3.ВыполнитьЗапрос(УчебныеСоединенияR3.ТекстДетальногоЗапроса(), Данные.Ключи);
    Итоги = УчебныеСоединенияR3.ВыполнитьЗапрос(УчебныеСоединенияR3.ТекстИтоговогоЗапроса(), Данные.Ключи);
    Протокол = Новый ТекстовыйДокумент;
    Для Каждого Р Из Строки Цикл
        Ключ = УчебныеСоединенияR3.МеткаКлиента(Р.Клиент, Данные);
        Если ТипЗнч(Р.Заявка) = Тип("Null") Тогда
            Заявка = "NULL";
        Иначе
            Заявка = ?(Р.Заявка = Данные.ПерваяЗаявка, "J1", "J2");
        КонецЕсли;
        Протокол.ДобавитьСтроку("ROW|" + Ключ + "|" + Заявка + "|" + УчебныеСоединенияR3.ТекстМинут(Р.Минуты));
    КонецЦикла;
    Для Каждого Р Из Итоги Цикл
        Протокол.ДобавитьСтроку("GROUP|" + УчебныеСоединенияR3.МеткаКлиента(Р.Клиент, Данные) + "|" + Строка(Р.Минуты));
    КонецЦикла;
    Внутренний = СтрЗаменить(УчебныеСоединенияR3.ТекстИтоговогоЗапроса(), "ЛЕВОЕ СОЕДИНЕНИЕ", "ВНУТРЕННЕЕ СОЕДИНЕНИЕ");
    Ошибочные = УчебныеСоединенияR3.ВыполнитьЗапрос(Внутренний, Данные.Ключи);
    Для Каждого Р Из Ошибочные Цикл
        Протокол.ДобавитьСтроку("INNER|" + УчебныеСоединенияR3.МеткаКлиента(Р.Клиент, Данные) + "|" + Строка(Р.Минуты));
    КонецЦикла;
    ПоИмени = СтрЗаменить(УчебныеСоединенияR3.ТекстИтоговогоЗапроса(), "К.Ссылка КАК Клиент", "К.Наименование КАК Клиент");
    ПоИмени = СтрЗаменить(ПоИмени, "СГРУППИРОВАТЬ ПО" + Символы.ПС + "    К.Ссылка", "СГРУППИРОВАТЬ ПО" + Символы.ПС + "    К.Наименование");
    Ошибочные = УчебныеСоединенияR3.ВыполнитьЗапрос(ПоИмени, Данные.Ключи);
    Для Каждого Р Из Ошибочные Цикл
        Протокол.ДобавитьСтроку("NAME|" + Р.Клиент + "|" + Строка(Р.Минуты));
    КонецЦикла;
    Протокол.Записать("$result", КодировкаТекста.UTF8);
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
"@
Execute $v.id $body
$observed=@([IO.File]::ReadAllLines($result)|Where-Object {$_ -ne ''}|Sort-Object)
$expected=@(('ROW|A|J1|'+$v.a),('ROW|A|J2|'+$v.b),'ROW|B|NULL|NULL',('GROUP|A|'+$v.total),'GROUP|B|0',('INNER|A|'+$v.total),('NAME|'+$v.name+'|'+$v.total))|Sort-Object
if(($observed -join "`n") -ne ($expected -join "`n")){throw ('Строки или группы не совпали: '+$v.id)}
$cases.Add(@{name=$v.id;observedRows=$observed;expectedRows=$expected;innerLostEmptyCustomer=$true;nameGroupingMergedDistinctReferences=$true;status='PASS'})
}
$hashes=@(Get-ChildItem -LiteralPath (Join-Path $Review 'code') -File|ForEach-Object {@{file=$_.Name;sha256=(Get-FileHash -LiteralPath $_.FullName).Hash.ToLowerInvariant()}})
$report=@{status='AUTOMATED PASS';platformVersion=(Get-Item -LiteralPath $platform).VersionInfo.ProductVersion;training1508Tested=$false;nativeLearnerGuiTested=$false;privateInfobaseOnly=$true;realAccountUsed=$false;progressWritten=$false;cases=$cases;steps=$steps;sources=$hashes;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash.ToLowerInvariant()}
Save (Join-Path $dest 'R3_NATIVE_RESULT.json') ($report|ConvertTo-Json -Depth 12)
Write-Output ('AUTOMATED PASS: '+$cases.Count+' cases; platform '+$report.platformVersion+'; training1508 and learner GUI NOT RUN')
