> **Основной язык документации: русский.** Русская версия является нормативной. Английская версия поддерживается как синхронизированное вторичное зеркало.

# Исследование юридической модели — 2026-09-17

## Краткий вывод

На текущем этапе **не добавлять корневой `LICENSE` — правильнее**, чем поспешно выбрать permissive/open-source лицензию. GitHub прямо указывает: без лицензии по умолчанию сохраняются обычные авторские права; при этом пользователи публичного GitHub всё равно могут просматривать и форкать репозиторий в пределах GitHub Terms.

После rights audit наиболее близкая к миссии модель выглядит многослойно:

- software: PolyForm Noncommercial 1.0.0 как первый кандидат;
- original course content/docs: CC BY-NC-SA 4.0;
- brand/mascot/logo: отдельное резервирование прав и trademark policy;
- third-party: собственные лицензии;
- secrets: технически не публикуются.

## Почему не MIT/Apache

Они относятся к permissive open-source лицензиям и допускают коммерческое использование. OSI отдельно подчёркивает, что open-source лицензия не может запрещать использование в коммерческой сфере. Следовательно, наша миссия несовместима с заявлением «полностью open source», если мы хотим запретить коммерческую перепаковку.

## Почему CC нельзя ставить на весь репозиторий

Creative Commons не рекомендует CC-лицензии для software. CC BY-NC-SA 4.0 подходит для авторских учебных материалов, документации, схем и иных не-software материалов, если права на них подтверждены.

## Почему нельзя считать архитектуру абсолютно защищённой

WIPO и российское право проводят границу между идеей/методом/системой и конкретным выражением. Код, текст, иллюстрации и оригинальная компоновка защищаются; общая идея платформы и педагогический метод как таковые — нет. Поэтому цель — не обещать «никто не сможет сделать похожее», а сделать юридически рискованным прямое копирование нашего кода/контента/бренда для коммерческой перепаковки.

## Российский контекст

ГК РФ охраняет программы для ЭВМ авторским правом как литературные произведения (ст. 1261), допускает добровольную государственную регистрацию программы/БД (ст. 1262), предусматривает открытые лицензии (ст. 1286.1), а зарегистрированный товарный знак даёт исключительное право на его использование в соответствующих товарах/услугах (ст. 1484).

Регистрация ПО не создаёт авторское право с нуля, но может быть полезна как дополнительная доказательная и реестровая мера.

## Бренд

Товарные знаки территориальны. Для международного расширения WIPO Madrid System позволяет запрашивать защиту в нескольких странах на основе подходящей базовой национальной/региональной заявки. До подачи нужен clearance по сходным обозначениям.

## GitHub enforcement

GitHub имеет отдельные процедуры copyright/DMCA и trademark complaints. Это практический механизм против прямых копий, но он работает лучше, когда у правообладателя аккуратно оформлены provenance, notices и, для trademark-процедур, регистрационные данные.

## Источники

1. Creative Commons BY-NC-SA 4.0 legal code — https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode
2. Creative Commons FAQ on software — https://creativecommons.org/faq/
3. PolyForm Noncommercial 1.0.0 — https://polyformproject.org/licenses/noncommercial/1.0.0
4. PolyForm license matrix — https://polyformproject.org/licenses
5. Open Source Initiative — https://opensource.org/faq and https://opensource.org/osd
6. GitHub repository licensing — https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository
7. GitHub content removal — https://docs.github.com/en/site-policy/content-removal-policies/submitting-content-removal-requests
8. GitHub trademark policy — https://docs.github.com/en/site-policy/content-removal-policies/github-trademark-policy
9. WIPO copyright protection — https://www.wipo.int/en/web/copyright/protection
10. WIPO Madrid System — https://www.wipo.int/en/web/madrid-system/
11. Роспатент — регистрация программ/БД — https://rospatent.gov.ru/ru/stateservices/gosudarstvennaya-registraciya-programmy-dlya-elektronnyh-vychislitelnyh-mashin-ili-bazy-dannyh-i-vydacha-svidetelstv-o-gosudarstvennoy-registracii-programmy-dlya-elektronnyh-vychislitelnyh-mashin-ili-bazy-dannyh-ih-dublikatov
12. Роспатент — регистрация товарного знака — https://rospatent.gov.ru/ru/stateservices/gosudarstvennaya-registraciya-tovarnogo-znaka-znaka-obsluzhivaniya-kollektivnogo-znaka-i-vydacha-svidetelstv-na-tovarnyy-znak-znak-obsluzhivaniya-kollektivnyy-znak-ih-dublikatov
