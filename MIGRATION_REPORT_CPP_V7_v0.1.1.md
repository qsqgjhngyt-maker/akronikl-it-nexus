# C++ v7 migration report

Source baseline: `cpp-course-main.zip` (SHA-256 `fa0f3b1f62f5796a5561147ceaeebccf12149d83c19286dcc8c68d6278b3aae5`).

Migrated without rewriting the original source: **40 lessons, 6 practicums, 7 projects, 98 PDF coverage rows**. Stable lesson IDs are taken from the Nexus curriculum mapping and retain `legacyIndex` 0–39. The legacy localStorage key `cpp_programming_pdf_course_v1` is read-only during discovery/import and is never deleted.

The monolithic legacy `index.html` is **not** used as the Nexus root. Its data and proven interaction patterns were decomposed into course data, core modules and shared UI.
