# CP-1.1 — DEFECT / FAILED EXPERIMENT LOG

## D-01 — устаревший legacy regression probe

**Проблема:** первый CI run `39895851099` упал после успешного CP-1.1 validator.  
**Гипотеза:** CP-1.1 сломал current UI baseline.  
**Проверка:** исходный Alpha10.3.1 `index.html` на SHA `0f71bb9f...` уже не содержит `id="boot-status"`, который требует `tools/verify-v011.mjs`.  
**Результат:** дефект pre-existing test baseline, не CP-1.1.  
**Решение:** production test не изменялся; CP-1.1 workflow использует актуальный `tests/production-entry-syntax-check.mjs`.  
**Regression:** следующий run PASS.

## D-02 — первая schema была C++-specific

**Проблема:** runtime constants и `code.*` activity types были зафиксированы общей JSON Schema.  
**Риск:** новый графический/симуляционный курс потребовал бы fork schema.  
**Решение:** общая schema сделана course-generic; C++ invariants перенесены в semantic validator.  
**Regression:** synthetic `computer-graphics` + `graphics.exercise` test.

## D-03 — synthetic правило Topic = Skill

**Проблема:** первая версия создавала один искусственный Skill для каждой из 40 тем.  
**Риск:** ложная семантика для будущего Skill Graph и ML-оценки. Три Gold Standard lessons уже показывают many-to-many mapping.  
**Решение:** Skill references берутся только из существующего `benchmark.skillGraph.strengthens`; остальные mappings явно `pending-cp3`.  
**Результат:** 15 canonical skills, 3 mapped topics, 37 pending topics.

## D-04 — legacy alias const correctness

**Проблема:** benchmark sources содержат `cpp.const-correctness` и `cpp.const.correctness`.  
**Решение:** adapter normalization `cpp.const-correctness → cpp.const.correctness`, source payload не изменяется; оба значения сохраняются в `sourceCodes`.  
**Результат:** единый canonical ID `skill.cpp.const.correctness` с traceability к двум source spellings.
