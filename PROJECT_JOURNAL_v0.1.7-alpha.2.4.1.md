# PROJECT JOURNAL — v0.1.7-alpha.2.4.1

Дата: 2026-09-26

Начата практическая реализация этапа **Nexus Identity & Account**.

Первый increment:
**Account Shell Foundation**.

Почему начинаем с него:
Identity должна стать видимой частью платформы до подключения внешних providers.

Реализовано:
- account chip в global header;
- nickname/state current Nexus Cloud;
- Account Center;
- home account block;
- device/security surfaces;
- explicit current-vs-planned authentication methods.

Ключевое ограничение:
этот increment не маскирует alpha `nexus-token` под полноценную Identity v2.

Следующий Identity increment должен переходить от UI/account shell к серверной session/account foundation.
