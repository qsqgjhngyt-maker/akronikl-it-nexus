# CI — ожидание настоящей готовности offline-кэша

29.10.2026. **STATUS: AUTOMATED PASS для исправления стенда.** Локальный эксперимент PASS2/2; полный повтор на094c430627335da4d2f0e2ca056ec98cc0bd379b, run40822642845 — все8 jobs SUCCESS, contract/D1/native40822642967 SUCCESS. Это фактическое закрытие прежних отказов подготовки offline-кэша. Отдельный CI последующей поправки заставки8a09253 ещё выполняется и не объявляется завершённым.

Наблюдение: M6 в main`b671b8f` остановился в job`123259752030` до начала accessibility-сценариев; M1 в feature`3ed4071` — в job`123275000652` до исполнения учебной программы. В обоих журналах `ONLINE_PUBLIC_PWA_NOT_READY`: прошли install/installed, worker ещё activating, `controller=null`, browser errors отсутствуют. Эти результаты остаются FAIL. Это не доказательство дефекта алгоритма или Qt-контрола: до них сценарии не дошли.

Причина отказа стенда — предел ожидания30s при холодной подготовке проверенного offline-графа. В обоих тестовых fixtures предел увеличен до90s. Требование реального `publicReady===true`, обработка browser/SW errors, фактическая установка и все следующие проверки сохранены. Home не ожидает заполнения кэша; его тайминг измеряется отдельно. Product Service Worker, runtime, данные, стили, API и схема не меняются.

Эксперимент с отдельными пустыми Chrome-профилями: старт регистрации настоящего SW намеренно задержан35s. Ответ готовности не подменяется; загружается точная сборка и проверяется действительный offline-кэш. Online fixture получил publicReady через39485ms ожидания, Module6 fixture —38935ms. Home видим через879/802ms в этом локальном эксперименте. Старый предел30s не мог завершить эти случаи. Оба новых прогона PASS, browser errors0, production requests0. Это не WAN-замер и не проверка физического телефона.

Доказательства: `docs/ru/03-content/evidence/cpp-course-studio-20261029/READINESS_BUDGET.json` и `docs/ru/03-content/evidence/cpp-course-refresh-20261029/CI_BASELINE_094.json`. Отдельный CI-сценарий с задержкой35s также прошёл. Старые FAIL сохранены как история; новый завершённый повтор включает настоящие M1–6, Qt/UI/accessibility и runtime audit.

Эта поправка стенда не меняла продукт…10.10.1. Его фактическая доставка102HTTP-файлов и приёмка владельцем на ПК/телефоне подтверждены отдельно. Следующая…10.10.2 исправляет повтор заставки при refresh; её статус и manifest находятся в `CPP_COURSE_REFRESH_FIX_RU.md`. Зелёный CI094c430 не подменяет новый повтор8a09253. Официальный релиз ожидает завершения текущих gates.

## Воспроизведение native Qt проверки

Локальный QA-образ требует development-пакеты OpenGL. Его Dockerfile теперь находится в `tests/fixtures/qt-native-portability.Dockerfile` и совпадает с использованным в эксперименте. Это проверочный образ; опубликованный browser runtime pack не пересобирается. Из корня репозитория:

```sh
docker build -t nexus-m6-qt:6.8.3-ems3.1.56 -f studio-build/containers/qt-wasm.Dockerfile studio-build/containers
docker build -t nexus-qt-native-portability:6.8.3 -f tests/fixtures/qt-native-portability.Dockerfile .
python tests/course-final-qt-native-portability.py --out ../native-exam-qa
```

Для TaskFlow и пяти Gold-вариантов установите `NEXUS_QT_EVIDENCE_DIR` в отдельный каталог вне репозитория и выполните `node tests/qt-template-native-portability.mjs`. CLI `--image` и `NEXUS_QT_NATIVE_IMAGE` позволяют указать совместимый готовый QA-образ. В native-эксперименте проверяются настоящие Qt и файловая система при read-only корне, uid1000 и отключённой сети.
