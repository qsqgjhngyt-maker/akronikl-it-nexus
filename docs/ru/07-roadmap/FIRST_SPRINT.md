> **Основной язык документации: русский.** Русская версия является нормативной. Английская версия поддерживается как вторичное зеркало для международных пользователей.

# Первый спринт после Foundation

## Цель
Получить архитектурный prototype без массового переписывания контента.

### S1.1 Baseline tests
Автоматизировать текущие проверки v7.

### S1.2 Data extraction
Вынести `lessons`, `PRACTICUMS`, `PROJECTS`, coverage/source metadata из `index.html` без изменения UI.

### S1.3 Stable IDs
Назначить стабильные content IDs и карту миграции текущего progress.

### S1.4 Reference lesson schema
Реализовать новую схему урока для 3 тем.

### S1.5 Akronikl context contract
Спроектировать JSON-контракт контекста без сетевого AI.

### Definition of Done
Старый UI/прогресс не потерян; три урока проходят новый schema/content audit; baseline regressions зелёные; никакой API-secret не добавлен.
