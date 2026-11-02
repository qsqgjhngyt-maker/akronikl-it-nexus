// Только известные коды; сырые ошибки браузера, URL и токены в интерфейс не выводим.
export function microphoneFailureMessage(code,{locale='ru',processing='browser'}={}){
 const messages={
  'permission-denied':['Доступ к микрофону не разрешён. Разрешите его для Nexus в настройках браузера и повторите.','Microphone access is not allowed. Enable it for Nexus in your browser settings, then retry.'],
  'device-missing':['Микрофон не найден. Подключите устройство и выберите его в браузере.','No microphone was found. Connect one and select it in the browser.'],
  'device-busy':['Браузер не смог открыть микрофон. Проверьте выбранное устройство и приложения, которые его используют.','The browser could not open the microphone. Check the selected device and other applications using it.'],
  'browser-network':['Сервис распознавания браузера не ответил. В этом браузере или сети он может быть недоступен. На ПК можно выбрать локальный Whisper; текст в чат также доступен.','The browser recognition service did not respond. It may be unavailable in this browser or network. On a PC you can select local Whisper, or type in the chat.'],
  'unsupported':['Этот браузер не поддерживает выбранное распознавание. На ПК выберите локальный Whisper или вводите текст.','This browser does not support the selected recognition mode. On a PC select local Whisper, or type.'],
  'local-unavailable':['Локальная модель браузера недоступна для выбранного языка. Выберите Whisper на ПК или другой способ ввода.','The browser on-device model is unavailable for this language. Select Whisper on your PC or another input method.'],
  'whisper-offline':['Модуль Whisper на этом ПК не запущен или недоступен. Для локального распознавания нужен отдельный модуль; одно открытие сайта его не запускает.','The Whisper companion on this PC is not running or cannot be reached. Local recognition needs the separate companion; opening the website does not start it.'],
  'whisper-busy':['Whisper ещё обрабатывает другую реплику. Дождитесь завершения и повторите.','Whisper is still processing another turn. Wait for it to finish, then retry.'],
  'whisper-model':['Версия локального Whisper или модели не совпала с проверенной. Обновите модуль по инструкции.','The local Whisper or model version does not match the verified version. Update the companion using its instructions.'],
  'no-speech':['Речь не обнаружена. Повторите реплику и проверьте, выбран ли нужный микрофон.','No speech was detected. Try again and check the selected microphone.']
 };
 const row=messages[code]||messages[processing==='local-ai'?'whisper-offline':'browser-network'];return row[locale==='en'?1:0];
}
export function microphoneErrorCode(error,processing){
 if(['NotAllowedError','PermissionDeniedError'].includes(error?.name))return'permission-denied';if(error?.name==='NotFoundError')return'device-missing';if(error?.name==='NotReadableError')return'device-busy';
 return({MIC_UNSUPPORTED:'unsupported',MIC_LOCAL_UNAVAILABLE:'local-unavailable',ASR_MODEL_REJECTED:'whisper-model',ASR_BUSY:'whisper-busy'})[error?.message]||(processing==='local-ai'?'whisper-offline':'browser-network');
}
