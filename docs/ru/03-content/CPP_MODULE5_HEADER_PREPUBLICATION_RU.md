# M5 Test.2 — подготовка публикации шапки локальной копии

27.10.2026. STATUS:IMPLEMENTED / LOCAL AUTOMATED PASS; публикация ещё не выполнена. Владелец отдельно разрешил тестовую публикацию main/production и запретил официальный релиз. Это разрешение хранится в чате, метаданные сами его не предоставляют.

Версия `0.1.7-alpha.2.4.6-ui1a.10.9-test.2`, generation `ui1a-cpp-gold-module5-test2-header-20261027`. Source `8e135c201be4275baaa06c6e65e23287be03eb60`; две независимые сборки совпали,3502 manifest records. Все4146 прежних immutable файлов сохранены. Добавлены263 файла нового поколения; Test.1 не перезаписывается. Два исходника шапки/Account из1dd56ca уже приняли05/07:CI12/12 и NEXUS-PERF-01.

В репозитории синхронизированы только четыре browser bundles BFF с уже установленным hotfix. Они пересобраны из принятого source, совпадают с live image `sha256:f1fc8e6faf945d12295a28ea0c72af394e756f4a59c307b5aa65cd942a75ced1` /revision `bbard7va4tkt9a3hvted`. Private Node BFF, sessions, Cloud, Project Store, stable IDs, C++ content/compiler source не меняются. Нового BFF deployment не планируется. Равенство compiler graph остаётся строгим для runtime; Account public policy проверяется независимо от его версии.

Новый scope отдельно закреплён в CPP_MODULE5_HEADER_PUBLICATION_SCOPE.json и tool constant. Проверяются source, metadata, все manifest bytes, старые поколения, BFF source/bundle parity и неизменный private/cache policy body SW. Предыдущие исторические gates не удалены. Четыре negative tests для текущего publication mode отвергают старый build, изменённые CSS/BFF/SW, подменённый receipt и traversal. Базовая геометрия теперь извлекается из прежнего main5e, поскольку текущая сборка уже исправлена.

LOCAL PASS:rebuild,7 Node tests, version consistency, зависимости/контракты,34 regression и13 integration. NEXUS-PERF-01:75модулей/591219B; outline27476B; labs45357B; field timing не измерялся. Текущая браузерная приёмка и новый CI фиксируются отдельно, не подменяются старыми12jobs.

При финальной проверке до merge обнаружено: вложенный `version.json.releaseCandidate.assetGeneration` ещё указывал Test.1. Исправлено на Test.2; добавлено обязательное равенство с candidate generation в source gate и version consistency. Снова получены две одинаковые сборки,7 Node tests и rebuild PASS; изменились только root/versioned version.json, generated SW config и BUILD_MANIFEST. Первоначальный d26c168 и его ZIP помечены DEPRECATED_NOT_PUBLISHED; их CI не выдаётся за CI исправленного commit. Шапка, compiler и C++ программы при этой коррекции не менялись. Откат и переход PWA повторяются для окончательных bytes.

Откат готовится к прежнему frontend Test.1 с сохранением всех будущих immutable bytes, текущего исправления client и четырёх BFF bundles. Его отдельные статические/runtime проверки и patch hash будут записаны до merge. Реальный BFF rollback на неисправный старый image для отката шапки использовать нельзя.

В доступной вкладке владелец выполнил обычный вход до публикации. Зафиксированы только локальные UI наблюдения для сравнения; личные данные/скриншоты в GitHub не помещаются. Cloud PUSH/PULL, очистки cookies/storage, создания аккаунта и перезаписи работ не будет.

WHAT REMAINS:CI новой сборки, откат и переход Test.1→Test.2→Test.1→Test.2, затем PR/merge/Pages/public smoke и проверка текущего аккаунта. Устройства владельца — отдельно после публикации. Официальный Release/тег не создавать.

ROUTING CHECK:07→05→00,01/02 о сохранении входа и runtime;04 — результаты уже принятого ADR. NEXT RECOMMENDED BRANCH:05. RECOMMENDED MODE:очень высокий для publication gate.
