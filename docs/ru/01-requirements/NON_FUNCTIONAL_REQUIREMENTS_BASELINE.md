# Non-Functional Requirements Catalog — v0.1.7-alpha.2.3

| ID | Priority | Status | Domain | Normative requirement |
| --- | --- | --- | --- | --- |
| NFR-PERF-001 | P0 | IMPLEMENTED | Быстрый старт | Стартовая оболочка не должна блокироваться загрузкой тяжёлой AI-модели. |
| NFR-PERF-002 | P1 | PLANNED | Responsiveness | Ключевые действия UI должны иметь измеряемый performance budget по mobile/desktop профилям. |
| NFR-MOBILE-001 | P0 | IMPLEMENTED | Mobile-first | Критические учебные и проектные сценарии не должны требовать desktop-only UI. |
| NFR-A11Y-001 | P1 | FOUNDATION | Доступность | Ключевые интерактивные элементы должны иметь клавиатурную навигацию, focus state и ARIA. |
| NFR-REL-001 | P0 | IMPLEMENTED | Безопасное обновление | Неудачное обновление PWA не должно уничтожать рабочую оболочку. |
| NFR-REL-002 | P0 | IMPLEMENTED | No silent lost update | Cloud Sync не должен молча терять более новую revision. |
| NFR-REL-003 | P1 | PLANNED | Backup/Recovery | Cloud user/project state должен иметь документированную стратегию backup и recovery. |
| NFR-MAINT-001 | P0 | IMPLEMENTED | Модульность | Platform core, course packages, runtime, project studio и sync должны оставаться логически разделёнными. |
| NFR-MAINT-002 | P0 | IMPLEMENTED | Stable IDs | Курсы/уроки/проекты должны использовать устойчивые идентификаторы, не зависящие от локализации. |
| NFR-OBS-001 | P1 | FOUNDATION | Диагностируемость | Критические ошибки должны диагностироваться без раскрытия секретов и избыточного пользовательского кода. |
| NFR-DOC-001 | P0 | IMPLEMENTED | Traceability | Архитектурно значимое изменение должно иметь журнал/ADR/changelog/test evidence. |
| NFR-I18N-001 | P0 | IMPLEMENTED | RU-first | Русская документация нормативна, английская поддерживается как синхронизированное зеркало. |
| NFR-I18N-002 | P1 | IMPLEMENTED | Locale separation | UI locale, course locale и mentor locale должны быть независимы. |
| NFR-OFFLINE-001 | P1 | FOUNDATION | Offline fallback | Основной локальный учебный путь должен сохранять работоспособность без сети в пределах кэшированных ресурсов. |
| NFR-PORT-001 | P1 | FOUNDATION | Provider portability | Cloud/AI/runtime provider должен заменяться через контракт без массового изменения content model. |
| NFR-PRIV-001 | P0 | PLANNED | Data minimization | Сбор учебных/AI событий должен быть минимальным, объяснимым и управляемым пользователем. |
| NFR-REPRO-001 | P0 | RESEARCH | AI reproducibility | AI-эксперименты должны фиксировать модель/конфигурацию, набор данных, метрики и процедуру воспроизведения. |
| NFR-SCALE-001 | P2 | PLANNED | Эволюционное масштабирование | Архитектура должна позволять масштабировать контент и пользователей без привязки к одному monolith-файлу или одному runtime. |
