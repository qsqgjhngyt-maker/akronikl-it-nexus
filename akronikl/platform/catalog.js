// AK-P1: проверяемые направления Nexus. Не роли, не полномочия сервера.
// Метки IMPLEMENTED описывают экран, а не готовность всего помощника.
export const PLATFORM_SCHEMA_VERSION = 1;
export const PLATFORM_SOURCE = 'd76d1613a1fbf6726d453e40366c306ea502d4c7';
const freeze = value => {if(value && typeof value === 'object'){for(const v of Object.values(value))freeze(v);Object.freeze(value)}return value};
const rows = [
 ['home','Главная','Home','#view=home','public',['главная','домой','home'],'core/learning-views.js'],
 ['academy','Академия','Academy','#view=academy','public',['академия','академию','курсы','academy','courses'],'core/academy-catalog.js'],
 ['programming','Программирование','Programming','#view=programming','public',['программирование','programming'],'core/code-hub-presentation.js'],
 ['projects','Мои проекты','My projects','#view=projects','private',['мои проекты','проекты','my projects','projects'],'project-studio/project-studio.js'],
 ['code-studio','Code Studio','Code Studio','#view=code-studio','private',['редактор','code studio','код студио','editor'],'project-studio/code-studio-home.js'],
 ['offline','Офлайн-центр','Offline center','#view=offline','public',['офлайн','офлайн центр','офлайн-центр','offline','offline center'],'pwa/offline-center.js'],
 ['blog','Блог','Blog','#view=blog','public',['блог','blog'],'core/content-public.js'],
 ['account','Аккаунт','Account','#view=account','server',['аккаунт','профиль','account','profile'],'core/account-shell.js'],
 ['feedback','Обратная связь','Feedback','#view=feedback','server',['обратная связь','обратную связь','feedback'],'feedback/ui.js'],
 ['reviews','Отзывы','Reviews','#view=reviews','server',['отзывы','reviews'],'feedback/ui.js'],
 ['computer-graphics','Графическая мастерская','Graphics workshop','#view=computer-graphics','private',['графика','графику','графическая мастерская','графическую мастерскую','graphics'],'effects/nexus-graphics-workshop.js'],
 ['labs','Лаборатории','Labs','#view=labs','public',['лаборатории','labs'],'core/nexus-learning-discovery.js'],
 ['practices','Практика','Practice','#view=practices','public',['практика','практику','practice'],'core/nexus-learning-discovery.js'],
 ['unlock','Личная офлайн-копия','Private offline copy','#view=unlock','offline',['личная копия','личную копию','локальная копия','локальную копию','private copy','local copy'],'pwa/offline-entry.js'],
 ['compiler','Офлайн-компилятор','Offline compiler','#view=compiler','offline',['компилятор','offline compiler','compiler'],'pwa/offline-entry.js'],
 ['admin','Администрирование','Administration',null,'restricted',['администрирование','admin','administration'],'core/administration-navigation.js'],
 ['skills','Карта навыков','Skill map',null,'planned',['навыки','карта навыков','карту навыков','skills','skill map'],'core/learning-views.js']
];
export const DESTINATIONS = freeze(rows.map(([id,ru,en,hash,access,aliases,source])=>({id,label:{ru,en},hash,access,aliases,source,
 implementation:access==='planned'?'PLANNED':'IMPLEMENTED'})));
const topics = [
 ['navigation',['помощь','что ты умеешь','что можно сделать','help','what can you do'],
  'Я могу показать текущий раздел, объяснить функции Nexus и предложить переход. Команда «Открой Академию» сначала покажет кнопку подтверждения. Это ограниченный набор команд, не свободный диалог с нейросетью.',
  'I can identify the current section, explain Nexus features and propose navigation. “Open Academy” first shows a confirmation button. These are bounded commands, not an AI conversation.', ['core/app.js','pwa/offline-entry.js']],
 ['code-studio',['что такое code studio','для чего code studio','помощь с редактором','what is code studio','editor help'],
  'Code Studio — редактор файлов проекта. Он показывает рабочие файлы и диагностику запуска. В этом этапе Akronikl не запускает программу и не исправляет код. Для просмотра фрагмента выделите строки и отдельно включите их в контекст.',
  'Code Studio edits project files and shows run diagnostics. At this stage Akronikl does not run or fix programs. Select a range and explicitly include it to review its context.', ['sandbox/code-studio.js','project-studio/code-studio-home.js']],
 ['offline',['как работать без интернета','как подготовить офлайн','как работать офлайн','offline help','how to work offline'],
  'В обычном Nexus откройте Офлайн-центр и подготовьте ресурсы при наличии сети. Для личных проектов нужна отдельная зашифрованная копия; для запуска C++ — подготовленный компилятор. Наличие сети само по себе не доказывает готовность ресурсов. Эту готовность показывает соответствующий экран.',
  'Open the Offline center in online Nexus and prepare resources while connected. Private projects require a separate encrypted copy; C++ execution requires a prepared compiler. Connectivity alone does not prove readiness: use the status shown by the relevant screen.', ['pwa/offline-center.js','pwa/offline-entry.js']],
 ['local-cloud',['чем отличается локальная копия от облачной','локальная копия и облако','local copy and cloud','local versus cloud'],
  'Личная офлайн-копия открывается локальной фразой и хранится на устройстве. Её разблокировка не выполняет вход в серверный аккаунт. Возвращение сети не означает автоматическую отправку изменений в облако. Используйте предусмотренный интерфейс переноса и синхронизации.',
  'A private offline copy is stored on this device and unlocked with a local phrase. Unlocking it does not sign in to the server account. Reconnecting does not automatically upload changes. Use the existing transfer and synchronization interface.', ['pwa/offline-center.js','pwa/offline-entry.js','sync/cloud-sync.js']],
 ['save',['как сохранить работу','как сохранить проект','как сохранить','save help','how to save'],
  'Сохранение зависит от открытого редактора. В личной офлайн-копии дождитесь успешного статуса сохранения; при ошибке не закрывайте редактор. Akronikl сейчас не выполняет сохранение и не утверждает, что оно завершилось. Проверяйте сообщение самого редактора.',
  'Saving depends on the active editor. In a private offline copy, wait for its successful save status; do not close the editor after a save error. Akronikl does not save data or claim completion. Check the editor’s own status message.', ['pwa/offline-entry.js','project-studio/project-studio.js']],
 ['settings',['как изменить язык','где настройки','настройки','settings','change language'],
  'Настройки языка и оформления находятся в шапке Nexus. Язык интерфейса, учебных материалов и помощника выбирается отдельно. Автоматическое изменение настроек голосом или командой в этом этапе не подключено.',
  'Language and appearance settings are in the Nexus header. Interface, course and assistant languages are separate. Changing these settings by voice or command is not connected in this stage.', ['core/shell-presentation.js','pwa/offline-entry.js']],
 ['unavailable',['почему кнопка недоступна','почему недоступно','why is this unavailable'],
  'Причина зависит от конкретного экрана. Проверьте вход в серверный аккаунт, состояние личной копии, сеть и сообщение у действия. Без этих данных я не могу достоверно назвать причину. Локальное открытие копии не заменяет серверную проверку прав.',
  'The reason depends on the screen. Check server sign-in, private-copy lock, connectivity and the action’s status message. Without that information I cannot determine the cause. Local unlock does not replace server permission checks.', ['core/bootstrap.js','pwa/offline-entry.js']],
 ['privacy',['что ты видишь','какие данные доступны','what can you see','privacy'],
  'Команды навигации получают режим оболочки и маршрут. В режиме «Разговор» подключённая модель получает отправленные сообщения, продолжение выбранной ветки и прикреплённые файлы. Учебный прогресс и выбранный код передаются согласно разрешениям в настройках. Данные другого аккаунта недоступны. Микрофон не включается.',
  'Navigation commands receive the shell mode and route. In Conversation mode a connected model receives sent messages, the selected branch history and attached files. Learning progress and selected code follow the permissions in Settings. Other accounts are inaccessible. The microphone is not activated.', ['akronikl/platform/service.js','akronikl/ui/nexus-host.js']]
];
export const HELP_TOPICS = freeze(topics.map(([id,aliases,ru,en,paths])=>({id,aliases,text:{ru,en},paths})));
export function destinationById(id){return DESTINATIONS.find(row=>row.id===id)||null}
export function allowedHash(hash){return typeof hash==='string'&&DESTINATIONS.some(row=>row.hash===hash)}
