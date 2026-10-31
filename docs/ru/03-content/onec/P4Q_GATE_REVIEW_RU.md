# Content review отдельно от исторического P4-Q выпуска

31.10.2026. **STATUS: IMPLEMENTED / локальный AUTOMATED PASS; CI нового HEAD фиксируется в PR metadata.** Прямое решение владельца после разбора: «Тогда нужно отделить это поведение, так как мы будем же последовательно наполнять платформу». Изменение находится только в Draft PR #63; main/production/merge/Release не выполнялись.

P4-Q — прежний выпуск самой платформы Nexus с опубликованным C++ и платформенными изменениями. Это не прежний выпуск курсов 1С.

## Причина прежнего отказа

Workflow подписывался на `courses/**` и безусловно вызывал `startup-intro-ci-route.mjs` → `courseCompletionScope()` → `p4qReleaseScope()`. [Run 41091945324](https://github.com/qsqgjhngyt-maker/akronikl-it-nexus/actions/runs/41091945324), job 124187807156, подтвердил отказ `P4-Q release branch`. На входном HEAD 54c504f дополнительно 107 путей сверх 668 путей исторического receipt; точный main d8721e0 имеет ровно 668. Расширение списка веток не исправило бы следующий path assertion. [Исходная диагностика](review-0305/evidence/P4Q_DIAGNOSIS.json), [CI excerpt](review-0305/evidence/P4Q_CI_EXCERPT.txt).

## Реализованное поведение

| Фактический diff | Путь проверки | Значение результата |
| --- | --- | --- |
| Добавление/редактирование обычных курсов, документация, соответствующие проверки курса | content_scope → content_review, плюс course-specific CI | CP-1.1 review; historical publication NOT REQUESTED; releaseEligible=false |
| C++, общий каталог, runtime, Identity, PWA, release или неизвестная область | Прежняя publication job со всеми прежними командами | Старый exact receipt/admission обязателен; mixed scope не получает content-only допуск |
| Ошибка diff, SHA, trusted source или bootstrap hash/mode | FAIL в content_scope | Следующие jobs не получают разрешение |

Обычный scope принимает только A/M regular files. D/R/symlink/submodule/path traversal не становятся наполнением. `courses/cpp`, `courses/programming` и общий catalog сохраняют специальный допуск. Production catalog/progress/runtime contracts этим не разрешаются. Generic checker проверяет CP-1.1 packages; BSL/native/browser остаются отдельными gates 1С.

Workflow запускается на все PR в main, без path filter всего workflow. Для обычного контента publication **SKIPPED**, не release PASS. Проверяется полный diff base/head (push: before/head). Base должен быть ancestor head; устаревший PR требуется обновить, неполный diff не принимается.

## Trusted source и первый ввод

Classifier выполняется из base commit, а не изменённого файла PR. Все refs — полные SHA с ancestry checks. Изменение classifier/workflow/общей проверки не расширяет scope автоматически.

В текущем base router ещё отсутствует. Для первого ввода используется immutable source commit `ba3581a44eb3522bdefd3b92adffac6dbd34a8ff`, закреплённый в workflow. Bootstrap разрешён только для точной базы d8721e0, PR #63/его ветки либо последующего push main с этой базы. Каждый из восьми согласованных routing files сверяется по точным mode/hash; scope читается из immutable commit и должен совпасть в head. Только commit pin нормализуется при hash workflow, чтобы исключить циклическую зависимость. [CI_ROUTING_SCOPE.json](review-0305/CI_ROUTING_SCOPE.json).

Bootstrap — reviewed first introduction, не разрешение merge. После принятия router в base следующие PR используют base-router. Репозиторные настройки — внешний уровень доверия: чтение `/branches/main/protection` вернуло 403; `/rulesets` вернул `[]`, что не доказывает отсутствия classic protection. Workflow не объявляется независимой защитой от автора/администратора с правом менять required checks. Перед merge нужен независимый review. Настройки не менялись.

## Сохранённая защита и evidence

P4-Q gate, receipt/hash/base/668 paths, before/after hashes/modes, branch allowlist, completion receipt и Intro admission не менялись. Тело прежней publication job сохранено дословно внутри условного запуска. Нет deploy/secrets/pull_request_target/continue-on-error, подмены ветки или автоматического success вместо проверки. Новые jobs: contents:read, checkout без сохранения credentials.

Десять route unit tests и три Intro regression tests прошли: onec и синтетический будущий rust; docs-only; C++/catalog/runtime/Identity/PWA/release; mixed/unknown/workflow; D/R/symlink/submodule; traversal; bootstrap hash/mode/base/PR/branch; запрет PR-router вместо base; точное сохранение старой job. Всего 25 групп регрессии, 50 unit checks; браузерный review 1С — 13 групп. Evidence: CONTENT_ROUTE_UNIT.txt, INTRO_ROUTE_REGRESSION.txt и ROUTING_RESULT.json в review-0305/evidence.

Первый source commit закрепляет bootstrap; это не итоговый integration candidate. Финальный commit добавляет pin и полную интеграцию, его CI оценивается отдельно. История промежуточных FAIL сохраняется. Положительный content review не даёт release eligibility. Новый официальный выпуск требует нового согласованного changeset/receipt; старый акт не применяется к будущим курсам.

GitHub: [workflow filters](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpull_requestpull_request_targetpathspaths-ignore), [required checks и skipped](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging).

## Routing

🔀 CROSS-BRANCH SYNC REQUIRED

Источник: 03/05, PR #63. Результат: по прямому решению владельца разделены content review и historical publication, release admission прежний. Куда: 00 → 05, security review — 01, content-specific runtime — 02. Когда: после CI итогового HEAD, перед merge/release решением. Что потом: review единственного #63, A2/P2 — один поток.

Готовый текст: «В #63 ordinary content проходит CP-1.1 review; publication для него NOT REQUESTED. Mixed/protected изменения сохраняют строгий historical gate. Immutable bootstrap ba3581a… и negative tests приложены. Receipts/allowlist/runtime/Identity не расширены; main/production не менялись. Нужны независимый review и подтверждение required-check contract; merge/Release не выполнялись».
