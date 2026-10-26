# C++ Module 5 — M5-0, аудит до Gold-authoring

26.10.2026, Asia/Krasnoyarsk. STATUS: PARTIAL. Это аудит возможностей и зависимостей, не готовые Gold-уроки и не публикация. Рабочая ветка `feature/academy-gold-standard-cpp-module-5`; main/production/release не менять.

## База и область

Опубликованная база main `065606a788198045cadf250fea663246ddbb2d56`, tree `25fd21682fc192a6736e83ec94140023aeb6fc7d`, версия …10.8-test.2. Подтверждённая приёмка M4 и UI записана в документах feature05cc8f2. Для старта M5 создан merge6936817: опубликованный main и только два финальных документа M4. Исполняемый продукт, все immutable generations, storage/migrations, Identity/Cloud/ProjectStore/runtime и учебные JSON побайтно равны main.

Исходный план25.10.2026:9 тем/18 будущих RU/EN объектов — три существующих темы ООП и шесть предложений: RAII/умные указатели; value semantics/copy/move; композиция/наследование/полиморфизм; исключения; шаблоны/concepts; проектирование/рефакторинг. Нулевое число зарегистрированных новых IDs. Curriculum остаётся50, legacy40. Источник и SHA256 плана — CPP_MODULE5_DEPENDENCIES.json.

Разрешены только M5 тесты, валидаторы, документация и feature-only CI. Нельзя тихо включать EH, менять provider/Worker/память/авторизацию или выдавать native PASS за browser PASS.

## Учебные зависимости

Четыре редакционных alias разрешены в опубликованные IDs M3/M4. DAG девяти тем проверен; существующие `cpp.oop-principles`, `cpp.classes-objects-state-control`, `cpp.constructors-destructors` сохраняют ID/legacyIndex/order. В каждой теме задано, что объяснить до применения, допустимый scaffold и что пока нельзя требовать.

Шаблоны не требуют EH как жёсткую предпосылку: исходный M5-A4→M5-A5 заменён зависимостью от value semantics и STL; порядок чтения после M5-A4 сохранён отдельно. Исключения остаются самостоятельной полной темой. Эта корректировка плана не регистрирует уроки и не скрывает EH gate.

Локально зависимости и static NEXUS-PERF-01 PASS:75 модулей/590301 B, cap75/600000. Product diff к main пуст, Home по реальному browser trace не загружает Gold/compiler. Field timing не измерялся.

## Сохранность

Локально11 синтетических групп PASS:0/50,23/50,40/50,50/50, legacy40/40, вычисление synthetic50/56 без изменения state, неизвестные IDs, повторный legacy import, quiz/code/stdin/VFS/unknown поля, настоящий ProjectStore/checkpoint, Offline conflict/repeat/mismatch и account isolation. Synthetic будущие IDs существуют только в тестовой памяти, не в curriculum.

Первые две попытки уточнили сам тест: неправильный namespace synthetic curriculum был корректно отвергнут; попытка смены account в одном контексте корректно отвергнута `ACCOUNT_SWITCH_REQUIRES_NAVIGATION`. Тест исправлен: валидный `cpp.synthetic-*` с отрицательным контролем и независимый synthetic controller B. Продукт и защитные правила не ослаблялись. Полный повтор PASS.

Browser/cold Offline локально PASS: три прежних M5 ID online и после полного закрытия браузера без сети, desktop/mobile(12 сочетаний), code/stdin/quiz/VFS/completed; настоящая сборка двух TU класса в Code Studio дала7,exit0. В encrypted IndexedDB сохранились все50 записей, legacy40/40, неизвестное поле, проект и checkpoint. Реальные аккаунты/cookies/Cloud/работы не читаются. Host g++/UBSan и CI ещё ожидаются и не объявляются PASS.

## Runtime — фактический локальный результат

25 программ/31 случая через настоящий router/Worker/Clang-WASI, закреплённые SHA256 bytes:27 capability PASS,3 корректных EH-сценария UNSUPPORTED,1 неожиданный отказ на raw string. Audit completed, harness PASS; общий runtime PARTIAL и fullM5Admission NOT_ADMITTED. Три существующих примера M5 работают без исправления исходников. Положительно проверены RAII/ранний return, unique/shared/weak_ptr, copy/move/rule-of-zero, virtual destructor/slicing, RTTI pointer/typeid, C++20 concepts, отрицательная компиляция private/constraint/unique-owner-copy, два TU/файловый артефакт и базовая регрессия M1–4. Это изолированный QA, не CDN/production LIVE.

| Дефект | Доказательство | Требование |
| --- | --- | --- |
| M5-P1-01 | inspect.support=guaranteed, но два EH probes/три случая возвращают WASM_CPP_EXCEPTIONS_UNSUPPORTED; текущий Worker использует -fno-exceptions | Согласовать truthful capability и полноценную стратегию EH; не объявлять stack unwinding/strong guarantee поддержанными браузером |
| M5-P1-02 | Корректный raw literal с текстом throw блокируется тем же guard до компиляции, обычная строка проходит | Разбор комментариев/литералов должен отличать текст от C++ tokens; исходник ученика не переписывать |

CI сохраняет красный runtime gate для PARTIAL/unsupported, а независимую preservation проверку запускает и после этого отказа. Ни continue-on-error, ни подмена exception задания кодом ошибки не используются. Неподдержка EH — ограничение текущего pinned sysroot; включение одного флага не считается доказанным решением.

## Routing и диплом

🔀 CROSS-BRANCH SYNC REQUIRED

Источник:03 CONTENT, M5-0.
Результат/milestone: DAG/сохранность подтверждены, runtime PARTIAL, два P1.
Куда:02 →05 →00;07/04 информационно;06 при выборе нового EH toolchain.01 без auth/Cloud-изменений.
Почему: runtime contract относится к02; Content не может молча обещать неподдержанную тему.
Когда: после независимого native/Offline/CI readback, до M5-1.
Что передать: base065606a,25 probes/31 case, raw-string и EH reproducer, hash контракты, синтетический preservation и CI факты.
Готовый текст для вставки: «M5-0 в feature: план9 тем/18 RUEN,50 текущих и40 legacy IDs без изменений. Локальные DAG/state/NEXUS-PERF-01 PASS. Реальный runtime27/31 capability PASS,3 EH UNSUPPORTED и raw-string false rejection; выявлены M5-P1-01/02. Полный M5 пока NOT_ADMITTED. Нужны truthful capability/EH strategy и исправление lexical guard в02 с сохранением source; main/production/release не менять. Native/Offline/CI остаток фиксировать отдельно, не считать заранее PASS».
Что потом: завершить аудит05, передать02; к M5-1 только после решения runtime gates.

Есть ли здесь материал для диплома? Да: разделение языка/host/toolchain/browser capability, expected unsupported против дефекта lexer, независимость curriculum DAG от порядка глав, synthetic replay/Offline evidence и неизменность продукта. До/после: только средства проверки; security contracts не меняются. Никакой эффективности обучения этот аудит не измеряет.

NEXT RECOMMENDED BRANCH:02 после завершения M5-0. RECOMMENDED MODE:высокий, очень высокий при изменении runtime architecture/cache/EH.
