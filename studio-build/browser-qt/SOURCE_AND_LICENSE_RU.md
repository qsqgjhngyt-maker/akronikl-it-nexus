# Qt browser runtime — исходники и лицензия

Новый универсальный Qt runtime и его связанный preview распространяются по GPL-3.0-only. Copyright2026 AKRONIKL IT NEXUS contributors для добавленного адаптера; Qt и сторонние компоненты сохраняют свои notices. Полный GPLv3 и поставленные upstream licenses находятся в source/licenses. Гарантия не предоставляется в пределах условий лицензий. Получатель вправе изучать, изменять и передавать соответствующие исходники и программу на условиях GPLv3.

Комплект source содержит полный официальный QtBase6.8.3, установленный исходный Emscripten3.1.56 вместе с libc/libc++/libc++abi/compiler-rt/runtime JS, лицензии, исходники адаптера, конфигурацию и scripts сборки. Шрифты/сторонние библиотеки Qt входят в QtBase source с собственными уведомлениями. Upstream source архивы предоставляются здесь рядом с бинарной поставкой, а не только ссылкой на сайт третьего лица.

Дополнительное внешнее воспроизведение сборки:

1. Установить Docker, Python3 и Node22+.
2. Собрать image по nexus-source/studio-build/containers/qt-wasm.Dockerfile. Базовый Emscripten image закреплён digest; Qt version6.8.3, aqt3.3.0. Image ID — наблюдаемый результат конкретной сборки и может отличаться после самостоятельной пересборки; это не обещание bit-for-bit воспроизводимости всех upstream binaries. Получить его через `docker image inspect nexus-m6-qt:6.8.3-ems3.1.56 --format '{{.Id}}'`.
3. Для пересборки самого Qt из приложенного архива использовать nexus-source/studio-build/browser-qt/rebuild-qt-sdk.sh внутри Emscripten3.1.56 SDK. Нужен host Qt6.8.3 для build tools; источник host tools — тот же QtBase архив. В проверке применён /opt/qt/6.8.3/gcc_64. Singlethread/static, Release, examples/tests OFF; используются bundled third-party libraries. Передать read-only source как /input, writable /work и /output. Сеть для configure/build не нужна, если SDK уже установлен.
4. Для универсального host использовать host.cpp, CMakeLists.txt и export-generator.py. Точная команда em++ и flags находятся в CMakeLists.txt; build script prepare-qt-browser-runtime.mjs фиксирует hashes и сжатые размеры. Запускать из `nexus-source`: `node tools/prepare-qt-browser-runtime.mjs --out /absolute/new-output --image nexus-m6-qt:6.8.3-ems3.1.56 --expected-image-id sha256:YOUR_OBSERVED_ID --public-base https://your-host.example/qt/ --parent https://your-nexus.example`. Значение YOUR_OBSERVED_ID заменить результатом inspect; новая папка обязательна, старые артефакты не перезаписываются. Для localhost предусмотрен явный `--local-test`. DYNAMIC_EXECUTION=0, WASM_BIGINT=1; global SDK рассчитан на один новый opaque iframe на запуск.
5. Исходники preview/bridge и accessible controls приложены. Изменённую сборку можно открыть со своим доверенным parent origin; проверка целостности требует обновлённого manifest, а не отключения проверки.

Новая локальная пересборка Qt из официального source успешно выполнена28.10.2026. Она подтверждает работоспособность source build route, не побайтовое равенство SDK, ранее скачанного aqt. Точная поставка артефактов описывается PACK_MANIFEST.json; SOURCE_MANIFEST.json описывает соответствующий source комплект.

Исходники ученических проектов — отдельные работы. Новые GPL-шаблоны имеют COPYING.txt и предупреждение при создании. Старые работы автоматически не перелицензируются и не публикуются. При передаче GUI-приложения с данным Qt runtime автор должен предоставить получателям соответствующие исходники и GPLv3 права. Личная работа в Nexus не означает автоматическую отправку в публичный GitHub.

Этот файл не изменяет лицензию остальных самостоятельных частей Nexus, взаимодействующих с изолированным приложением по ограниченному протоколу сообщений.

Официальные условия: [Qt6.8 licensing](https://doc.qt.io/qt-6.8/licensing.html),
[обязанности открытых лицензий Qt](https://www.qt.io/development/open-source-lgpl-obligations).
Полный текст GPLv3 лежит в COPYING.txt, тексты сторонних лицензий — в licenses и
в исходных архивах. Исходники доступны рядом с runtime без входа, оплаты и запроса
разрешения. Комплект не содержит приватного экзаменационного ключа, личных работ,
cookies и серверных credentials.
