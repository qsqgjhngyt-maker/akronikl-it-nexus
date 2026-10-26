# C++ Module 5 — M5-0, аудит до Gold-authoring

26.10.2026, Asia/Krasnoyarsk. **STATUS: PARTIAL. Аудит M5-0 завершён; полный Module 5 NOT_ADMITTED.** Два P1 открыты. Это аудит возможностей и зависимостей, не готовые Gold-уроки и не публикация. Рабочая ветка `feature/academy-gold-standard-cpp-module-5`; main/production/release не менять. Проверенный changeset `043cb31dbf87c3e425088698e4246eb85df600fe`; последующая фиксация отчёта меняет только документы.

## База и область

Опубликованная база main `065606a788198045cadf250fea663246ddbb2d56`, tree `25fd21682fc192a6736e83ec94140023aeb6fc7d`, версия …10.8-test.2. Подтверждённая приёмка M4 и UI записана в документах feature05cc8f2. Для старта M5 создан merge6936817: опубликованный main и только два финальных документа M4. Исполняемый продукт, все immutable generations, storage/migrations, Identity/Cloud/ProjectStore/runtime и учебные JSON побайтно равны main.

Исходный план25.10.2026:9 тем/18 будущих RU/EN объектов — три существующих темы ООП и шесть предложений: RAII/умные указатели; value semantics/copy/move; композиция/наследование/полиморфизм; исключения; шаблоны/concepts; проектирование/рефакторинг. Нулевое число зарегистрированных новых IDs. Curriculum остаётся50, legacy40. Источник и SHA256 плана — CPP_MODULE5_DEPENDENCIES.json.

Разрешены только M5 тесты, валидаторы, документация и feature-only CI. Нельзя тихо включать EH, менять provider/Worker/память/авторизацию или выдавать native PASS за browser PASS.

## Учебные зависимости

Четыре редакционных alias разрешены в опубликованные IDs M3/M4. DAG девяти тем проверен; существующие `cpp.oop-principles`, `cpp.classes-objects-state-control`, `cpp.constructors-destructors` сохраняют ID/legacyIndex/order. В каждой теме задано, что объяснить до применения, допустимый scaffold и что пока нельзя требовать.

Шаблоны не требуют EH как жёсткую предпосылку: исходный M5-A4→M5-A5 заменён зависимостью от value semantics и STL; порядок чтения после M5-A4 сохранён отдельно. Исключения остаются самостоятельной полной темой. Эта корректировка плана не регистрирует уроки и не скрывает EH gate.

Локально и в CI зависимости и static NEXUS-PERF-01 PASS: 75 модулей / 590301 B, cap 75 / 600000; outline 2 файла / 27551 B при cap 30000. Product diff к main пуст, Home по реальному browser trace не загружает Gold/compiler. Field timing не измерялся; физических замеров на телефоне нет.

## Сохранность

Локально и в независимом CI 11 синтетических групп PASS: 0/50, 23/50, 40/50, 50/50, legacy40/40, вычисление synthetic50/56 без изменения state, неизвестные IDs, повторный legacy import, quiz/code/stdin/VFS/unknown поля, настоящий ProjectStore/checkpoint, Offline conflict/repeat/mismatch и account isolation. Synthetic будущие IDs существуют только в тестовой памяти, не в curriculum.

Первые две попытки уточнили сам тест: неправильный namespace synthetic curriculum был корректно отвергнут; попытка смены account в одном контексте корректно отвергнута `ACCOUNT_SWITCH_REQUIRES_NAVIGATION`. Тест исправлен: валидный `cpp.synthetic-*` с отрицательным контролем и независимый synthetic controller B. Продукт и защитные правила не ослаблялись. Полный повтор PASS.

Browser/cold Offline локально и в CI PASS: три прежних M5 ID online и после полного закрытия браузера без сети, viewport 1366/390 (12 сочетаний), code/stdin/quiz/VFS/completed; настоящая сборка двух TU класса в Code Studio дала `7`, exit0. В encrypted IndexedDB сохранились все 50 записей, legacy40/40, неизвестное поле, проект и checkpoint. Четыре независимые группы PASS. Реальные аккаунты/cookies/Cloud/работы не читаются. Это AUTOMATED PASS на синтетических данных, не новый LIVE PASS личного аккаунта владельца.

## Runtime — фактический локальный результат и повтор в CI

25 программ / 31 случай через настоящий router/Worker/Clang-WASI, закреплённые SHA256 bytes: 27 capability PASS, 3 корректных EH-сценария UNSUPPORTED, 1 неожиданный отказ на raw string. Из 27 PASS три — ожидаемые ошибки компиляции, 24 — успешные исполнения. Audit completed, harness PASS; общий runtime PARTIAL и fullM5Admission NOT_ADMITTED. Три существующих примера M5 работают без исправления исходников. Положительно проверены RAII/ранний return, unique/shared/weak_ptr, copy/move/rule-of-zero, virtual destructor/slicing, RTTI pointer/typeid, C++20 concepts, отрицательная компиляция private/constraint/unique-owner-copy, два TU/файловый артефакт и базовая регрессия M1–4. Локальный прогон и CI совпали по 31 source hash, результатам, provider, assessment и кодам ошибок. Это изолированный QA, не CDN/production LIVE.

| Дефект | Доказательство | Требование |
| --- | --- | --- |
| M5-P1-01 | inspect.support=guaranteed, но два EH probes/три случая возвращают WASM_CPP_EXCEPTIONS_UNSUPPORTED; текущий Worker использует -fno-exceptions | Согласовать truthful capability и полноценную стратегию EH; не объявлять stack unwinding/strong guarantee поддержанными браузером |
| M5-P1-02 | Корректный raw literal с текстом throw блокируется тем же guard до компиляции, обычная строка проходит | Разбор комментариев/литералов должен отличать текст от C++ tokens; исходник ученика не переписывать |

CI сохраняет красный runtime gate для PARTIAL/unsupported, а независимую preservation проверку запускает и после этого отказа. Ни continue-on-error, ни подмена exception задания кодом ошибки не используются. Неподдержка EH — ограничение текущего pinned sysroot; включение одного флага не считается доказанным решением.

Корректный воспроизводитель второго P1:

```cpp
#include <iostream>
int main() { std::cout << R"tag(" throw ")tag" << '\n'; }
```

Ожидается строка `" throw "` и перевод строки. Native исполняет её, Nexus блокирует до компиляции. Это false positive guard, а не ограничение C++ raw literals. Для закрытия нужны литералы с delimiter/prefix/кавычками и комментариями, реальные EH negative controls, online и cold Offline; переписывать исходник ученика нельзя. Для первого P1 нужны честный inspect/run contract и отдельное доказательство stack unwinding/strong guarantee в разрешённом provider. Одно исправление capability label не даёт полного допуска M5.

## Независимые проверки и evidence

[CI40273064360](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/40273064360), проверенный SHA `043cb31dbf87c3e425088698e4246eb85df600fe`, завершён **FAILURE** из-за runtime admission. Это фактический gate, не зелёная приёмка всего M5.

| Проверка | Результат |
| --- | --- |
| Job invariants121409888566 | SUCCESS: DAG, 11 групп сохранности, 34 группы регрессии M1–4, 13 интеграционных групп, 10 node tests без отказов |
| Job native121409888291 | SUCCESS: g++13.3, C++20/UBSan, 25 программ / 31 случай; три ожидаемые ошибки компиляции также подтверждены |
| Job browser121409888477 | FAILURE: runtime PARTIAL, два P1; отдельный cold Offline preservation step SUCCESS |
| Source/cases/files/stdin/ожидания | Native/browser parity PASS; все probe JSON contract hashes сопоставлены с CI |
| Сборка относительно принятой M4 Test.2 | Все 2977 файлов / 55609852 B побайтно совпадают, включая 2976 записей manifest; tree SHA256 `7f153a11776bc8b47701d3a4db512aff72d2f3327293b8d4ad1de07a00ffc270` |
| Main readback | `065606a788198045cadf250fea663246ddbb2d56`, без изменений |

EH включён на host только для двух соответствующих probes, остальные положительные случаи собраны с `-fno-exceptions`. Native подтверждает корректность программ, а не поддержку EH браузером. Сравниваются определённые результаты; нет UB, зависимости от `typeid.name()`, неоговорённого moved-from значения или времени исполнения.

Машинная фиксация: `CPP_MODULE5_M5_0_EVIDENCE.json`. Там SHA256 исходных snapshots, checks, CI artifact IDs/digests и хеши локальных JSON. Все три ZIP артефакта скачаны и проверены по GitHub SHA256. Локальный каталог `outputs/academy-gold-m5-0-20261026` содержит полные результаты, методы и whitelisted архив evidence; runtime cache, TLS keys и browser profiles не входят в архив. Никаких owner data/screenshots, keys, cookies, production/Cloud writes или нового Release/tag.

Основание семантики: [раскрутка стека и деструкторы](https://eel.is/c++draft/except.ctor), [copy/move constructors](https://eel.is/c++draft/class.copy.ctor), [dynamic_cast](https://eel.is/c++draft/expr.dynamic.cast). Это текущий открытый draft, не отдельная копия стандарта C++20; режим C++20 подтверждён компиляцией. Время обучения и достижение университетского уровня этот технический gate не измеряет.

## Routing и диплом

🔀 CROSS-BRANCH SYNC REQUIRED

Источник:03 CONTENT, M5-0.
Результат/milestone: DAG/сохранность подтверждены, runtime PARTIAL, два P1.
Куда:02 →05 →00;07/04 информационно;06 при выборе нового EH toolchain.01 без auth/Cloud-изменений.
Почему: runtime contract относится к02; Content не может молча обещать неподдержанную тему.
Когда: сейчас, M5-0 завершён; до M5-1.
Что передать: base065606a, tested043cb31, 25 probes/31 case, raw-string и EH reproducer, hash контракты, synthetic/cold Offline и независимые CI факты.
Готовый текст для вставки: «M5-0 в feature/academy-gold-standard-cpp-module-5 завершён, STATUS PARTIAL, fullM5Admission NOT_ADMITTED. План 9 тем/18 будущих RU/EN, новые IDs не назначены; 50 текущих и 40 legacy IDs сохранены. DAG, 11 state groups, 12 online/cold Offline сочетаний, 34 regression + 13 integration + 10 node tests и static NEXUS-PERF-01 PASS. Native C++20/UBSan 31/31; browser 27 PASS, 3 EH UNSUPPORTED, 1 raw-string false rejection. Два P1 открыты: misleading guaranteed для EH и lexical guard. CI40273064360 FAILURE именно на runtime gate, preservation step SUCCESS. Нужны исправления в02 и отдельное доказательство полноценного EH; source не переписывать. Main065606a, production и релизы не менялись. Отчёт и JSON evidence в docs/ru/03-content/CPP_*MODULE5*. Следующий приоритет — runtime gates, затем повтор M5-0 и M1–4; M5-1 пока не начинать».
Что потом: 02 — runtime; 05 — сохраняет PARTIAL, не допускает публикацию; 00 — фиксирует milestone и приоритет. 07 — будущая UX проверки diagnostics/Offline; 04 — метод воспроизводимости и ограничения. 06 нужен при сравнении EH toolchains; 01 изменений contract нет. Routing подготовлен, сообщения в другие чаты не отправлялись.

Есть ли здесь материал для диплома? Да: разделение языка/host/toolchain/browser capability, expected unsupported против дефекта lexer, независимость curriculum DAG от порядка глав, synthetic replay/Offline evidence и неизменность продукта. До/после: только средства проверки; security contracts не меняются. Никакой эффективности обучения этот аудит не измеряет.

WHAT WAS PROVED: DAG/ID invariants, synthetic preservation, cold Offline, определённая семантика C++20 на host, фактические границы WASM и два воспроизводимых P1, неизменность продукта и static performance budget.

WHAT REMAINS: закрыть M5-P1-01/02, доказать полноценный EH для M5; после этого повторить M5-0 и регрессию M1–4. Все 18 Gold-объектов M5 пока PLANNED.

NEXT RECOMMENDED BRANCH:02. RECOMMENDED MODE: высокий, очень высокий при изменении runtime architecture/cache/EH.
