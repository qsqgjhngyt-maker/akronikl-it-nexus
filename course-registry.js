# C++ v7 Migration Bridge

Legacy storage key: `cpp_programming_pdf_course_v1`.

Alpha.1 мигрирует:
- completed lesson indexes → stable lesson IDs;
- quiz/code/stdin/deep/notes/confidence/mentor per lesson;
- practicum/project state в `courses.cpp.legacyV7`;
- raw snapshot сохраняется в migration record для восстановления.

Гарантии:
- legacy-ключ не удаляется;
- legacy-ключ не перезаписывается;
- импорт повторяем и merge-oriented;
- уже существующий новый progress имеет приоритет там, где значение уже задано.

Ограничение: localStorage доступен по origin. Автообнаружение сработает, если старый `cpp-course` и Nexus запускались на одном origin, например оба под `qsqgjhngyt-maker.github.io`.
