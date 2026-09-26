# Data Ownership Matrix

| Data | System of record | Writer | Reader | Current/Target |
|---|---|---|---|---|
| course content | repository | developer/CMS later | browser | CURRENT |
| local course progress | browser state | browser | browser | CURRENT |
| cloud learning progress | future server store | learning service | browser/AI policy | TARGET |
| local project | browser Project DB | Project Studio | runtime/sync | CURRENT |
| cloud project metadata | D1 | Worker | Worker/client via API | CURRENT |
| cloud snapshot | D1 | Worker | Worker/client via API | CURRENT |
| cloud revision | D1 | Worker only | client via API | CURRENT |
| ACL | D1 | server/admin/team actions | Worker | CURRENT FOUNDATION |
| raw Nexus token | user device at issue/use | bootstrap/user device | Worker request only | CURRENT DEBT |
| token hash | D1 | Worker | Worker | CURRENT |
| account identity provider link | future account store | Identity service | Identity service | TARGET |
| session | future Identity service/store | Identity service | browser/server | TARGET |
| learning events | future event store | learning pipeline | learner model/research | TARGET |
| skill graph | future controlled content store | developer/admin | learning/AI | TARGET |
| mastery estimate | future learner model store | learner model | UI/recommender/AI | RESEARCH |
| AI context snapshot | future AI context store | Context Engine | evaluation/audit | RESEARCH |
| AI provider secret | secret manager | operator | secure gateway only | TARGET |
