# Use Cases — v0.1.7-alpha.2.3

| ID | Use case | Actor | Precondition/Status | Main success flow |
| --- | --- | --- | --- | --- |
| UC-001 | Продолжить обучение | Learner | Открывает Nexus на устройстве | Платформа показывает курс и сохранённый прогресс; пользователь продолжает урок. |
| UC-002 | Выполнить код из урока | Learner | Открыт урок/Code Studio | Пользователь меняет код → запускает runtime → получает stdout/stderr/diagnostics. |
| UC-003 | Работать с multi-file проектом | Learner/Developer | Project Studio | Создание/переименование/удаление файлов, build/run, состояние сохраняется. |
| UC-004 | Создать checkpoint | Learner/Developer | Проект изменён | Создаётся именованная контрольная точка; возможен restore. |
| UC-005 | Подключить Nexus Cloud v1 | Owner alpha | Worker доступен | Bootstrap/connect связывает local identity с account subject. |
| UC-006 | Синхронизировать проект на другое устройство | Authenticated user | Cloud connection | PUSH на A → PULL на B → получен cloud snapshot и revision. |
| UC-007 | Защититься от stale write | Authenticated user | Два устройства имеют одну base revision | Одно устройство создаёт новую revision; stale PUSH второго отклоняется как conflict. |
| UC-008 | Восстановиться после конфликта | Authenticated user | Conflict state | Пользователь PULL актуальную revision, применяет свои изменения осознанно и PUSH новую revision. |
| UC-009 | Войти в Nexus Identity v2 | User | PLANNED | Пользователь выбирает provider/passkey/phone → создаётся защищённая session → профиль восстанавливается. |
| UC-010 | Получить прогресс на новом устройстве | User | PLANNED после Identity v2 | После входа загружаются профиль, course progress, skill state и доступные проекты. |
| UC-011 | Управлять устройствами и MFA | User | PLANNED | Пользователь видит sessions/devices, добавляет passkey/TOTP, отзывает сессию. |
| UC-012 | Опубликовать учебный контент | Admin/Developer | PLANNED Control Center | Создание/preview/validation/publish курса, урока или статьи без ручной правки production файлов. |
| UC-013 | Связаться с разработчиком | User | PLANNED Support | Создать обращение → получить ответ → продолжить thread внутри Nexus. |
| UC-014 | Получить AI-разбор ошибки | Learner | RESEARCH/PLANNED | Context Gateway собирает разрешённый учебный и code context → AI объясняет ошибку с привязкой к уровню. |
| UC-015 | Получить следующий учебный шаг | Learner | RESEARCH | Recommendation Engine использует Skill Graph + Learner Model и объясняет рекомендацию. |
| UC-016 | Провести AI evaluation | Researcher/Developer | RESEARCH | Один dataset прогоняется через Generic LLM и Nexus AI; метрики сохраняются воспроизводимо. |
