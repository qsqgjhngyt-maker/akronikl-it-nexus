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
$xml=[IO.File]::ReadAllText((Join-Path $Repo 'courses\onec-education\native\service-desk-advanced\CommonModules\УчебныеЗадания.xml')).Replace('УчебныеЗадания','УчебнаяПодготовкаФорм').Replace('1f0db6e0-2d5c-41ed-ae43-0dcc40799bb8','90f6207b-563b-4eb6-a541-49ea1dc16fb8').Replace('Оригинальная учебная фоновая операция','Оригинальные учебные опыты документа и транзакций в отдельной базе')
$commonPath=Join-Path $source 'CommonModules\УчебнаяПодготовкаФорм\Ext\Module.bsl';New-Item -ItemType Directory -Path (Split-Path $commonPath -Parent) -Force|Out-Null
[IO.File]::WriteAllText((Join-Path $source 'CommonModules\УчебнаяПодготовкаФорм.xml'),$xml,$enc)
$cfg=Join-Path $source 'Configuration.xml';[IO.File]::WriteAllText($cfg,[IO.File]::ReadAllText($cfg).Replace('<ChildObjects>','<ChildObjects><CommonModule>УчебнаяПодготовкаФорм</CommonModule>'),$enc)

[IO.File]::WriteAllText($commonPath,[IO.File]::ReadAllText((Join-Path $code 'register-fixture-first.bsl')),$enc)
$form=Join-Path $source 'Documents\ЗаявкаУслуги\Forms\УчебнаяФормаЗаявки\Ext\Form.xml'
$formText=[IO.File]::ReadAllText($form).Replace('</Attributes>','<Attribute name="ИтогОпыта" id="2"><Type><v8:Type>xs:string</v8:Type><v8:StringQualifiers><v8:Length>120</v8:Length><v8:AllowedLength>Variable</v8:AllowedLength></v8:StringQualifiers></Type></Attribute><Attribute name="ВерсияЗапроса" id="3"><Type><v8:Type>xs:decimal</v8:Type><v8:NumberQualifiers><v8:Digits>10</v8:Digits><v8:FractionDigits>0</v8:FractionDigits><v8:AllowedSign>Any</v8:AllowedSign></v8:NumberQualifiers></Type></Attribute></Attributes>')
[IO.File]::WriteAllText($form,$formText,$enc)
$formCode=Join-Path $code 'form-context-first.bsl'
$formModule=Join-Path (Split-Path $form -Parent) 'Form\Module.bsl';New-Item -ItemType Directory -Path (Split-Path $formModule -Parent) -Force|Out-Null
[IO.File]::WriteAllText($formModule,[IO.File]::ReadAllText($formCode),$enc)
$resultFile=Join-Path $dest 'forms.txt'
$startup=@"
Процедура ПриНачалеРаботыСистемы()
    Д = УчебнаяПодготовкаФорм.НовыйНаборРегистров();
    Форма = ПолучитьФорму("Документ.ЗаявкаУслуги.Форма.УчебнаяФормаЗаявки",Новый Структура("Ключ",Д.Первая));
    Форма.Открыть();
    Проверки = Новый Массив;
    Форма.Объект.ДлительностьМинут = 77;
    Сверка = Форма.СверитьБуфер();
    Если Сверка.ВФорме = 77 И Сверка.ВОбъекте = 77 И Сверка.ВБазе = 30 Тогда Проверки.Добавить("P8.form-buffer-object-persisted|PASS"); КонецЕсли;
    Если Форма.ЧасыНаСервере(90) = 1.5 Тогда Проверки.Добавить("P8.no-context-explicit-numeric-input|PASS"); КонецЕсли;
    Отказ = Ложь; Попытка Форма.ЧасыНаСервере(1441); Исключение Отказ = Истина; КонецПопытки;
    Если Отказ Тогда Проверки.Добавить("P8.server-rejects-out-of-range|PASS"); КонецЕсли;
    Форма.ВерсияЗапроса = 2;
    Форма.ПослеПодтверждения(КодВозвратаДиалога.Нет,Новый Структура("Версия,Минуты",2,77));
    Если Форма.ИтогОпыта = "Отменено" Тогда Проверки.Добавить("P8.callback-no-cancels|PASS"); КонецЕсли;
    Форма.ПослеПодтверждения(КодВозвратаДиалога.Да,Новый Структура("Версия,Минуты",1,77));
    Если Форма.ИтогОпыта = "Устаревшее намерение" Тогда Проверки.Добавить("P8.stale-generation-rejected|PASS"); КонецЕсли;
    Форма.ПослеПодтверждения(КодВозвратаДиалога.Да,Новый Структура("Версия,Минуты",2,75));
    Если Форма.ИтогОпыта = "Устаревшее намерение" Тогда Проверки.Добавить("P8.changed-buffer-rejected|PASS"); КонецЕсли;
    Форма.Объект.ДлительностьМинут = 90;
    Форма.ПослеПодтверждения(КодВозвратаДиалога.Да,Новый Структура("Версия,Минуты",2,90));
    Если Число(Форма.ИтогОпыта) = 1.5 И Д.Первая.ДлительностьМинут = 30 Тогда Проверки.Добавить("P8.accepted-current-intent-does-not-write|PASS"); КонецЕсли;
    Форма.Модифицированность = Ложь; Форма.Закрыть();
    Текст = Новый ТекстовыйДокумент; Текст.УстановитьТекст(СтрСоединить(Проверки,Символы.ПС)); Текст.Записать("$resultFile",КодировкаТекста.UTF8);
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
"@
[IO.File]::WriteAllText((Join-Path $source 'Ext\ManagedApplicationModule.bsl'),$startup,$enc)
$base=Join-Path $dest 'own-form-base';Invoke-Own 'create' @('CREATEINFOBASE',('File="'+$base+'";'))
Invoke-Own 'load' @('DESIGNER','/F',('"'+$base+'"'),'/LoadConfigFromFiles',('"'+$source+'"'),'/UpdateDBCfg')
Invoke-Own 'check-contexts' @('DESIGNER','/F',('"'+$base+'"'),'/CheckConfig','-ThinClient','-ThickClientManagedApplication','-Server','-ConfigLogicalIntegrity')
Invoke-Own 'run-real-managed-form' @('ENTERPRISE','/F',('"'+$base+'"'))
$checks=if(Test-Path -LiteralPath $resultFile){@([IO.File]::ReadAllLines($resultFile)|Where-Object {$_})}else{@()}
if($checks.Count -ne 7){throw 'Не выполнены семь независимых проверок формы'}
$r=[ordered]@{schemaVersion=1;status='AUTOMATED PASS';platformVersion=(Get-Item -LiteralPath $platform).VersionInfo.ProductVersion;onlyOwnSyntheticInfobase=$true;actualManagedFormOpened=$true;thinClientAndServerCompilation=$true;nativeClientRuntime='Thick managed client';physicalDialogInteractionVerified=$false;callbackCasesInvokedDirectly=$true;originalDurationPreserved=30;training1508Verified=($platform -match '1508');realAccountUsed=$false;progressWritten=$false;codeVerifiedServer=$false;runnerSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant();formSourceSha256=(Get-FileHash -LiteralPath $formCode -Algorithm SHA256).Hash.ToLowerInvariant();preparationSha256=(Get-FileHash -LiteralPath (Join-Path $code 'register-fixture-first.bsl') -Algorithm SHA256).Hash.ToLowerInvariant();formMetadataSha256=(Hash-Text $formText);checks=$checks;fixture=$fixtureFiles;steps=$steps}
[IO.File]::WriteAllText((Join-Path $dest 'PEDAGOGY_FORMS_RESULT.json'),($r|ConvertTo-Json -Depth 8),$enc)
Write-Output ([pscustomobject]@{status=$r.status;checks=$checks.Count;physicalDialogInteractionVerified=$false}|ConvertTo-Json -Compress)
