# CHANGELOG v0.1.7-alpha.1.3.1

- fix(Code Studio): ignore trailing whitespace-only lines when calculating outer editor height.
- fix(Code Studio): empty/cleared files collapse to the compact baseline and reset editor scroll.
- fix(Code Studio): cap desktop editor growth at a comfortable viewport and keep larger files inside the editor scroll area.
- fix(Code Studio): keep highlight and line-number gutter scroll synchronized after shrink/recovery.
- test: add editor viewport recovery regression coverage without changing Project VFS or session resume semantics.
