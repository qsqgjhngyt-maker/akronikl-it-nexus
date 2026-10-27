const rows={
 personality:['Личность и общение','Personality and communication'],profile:['Профиль общения','Communication profile'],
 partner:['Напарник','Companion'],mentor:['Наставник','Tutor'],engineer:['Инженер','Engineer'],
 humor:['Юмор','Humour'],directness:['Прямолинейность','Directness'],friendliness:['Дружелюбие','Friendliness'],
 personalityIntro:['Спокойный, практичный напарник: ясно объясняет, признаёт ограничения и не смеётся над вашими ошибками.','A calm, practical companion: explains clearly, admits limits and never mocks your mistakes.'],
 personalityScale:['Проценты задают желаемый стиль, а не точность модели и не вероятность шутки. Даже 100% юмора — не шутка в каждом ответе.','Percentages express preferred style, not model accuracy or the probability of a joke. Even 100% humour does not mean a joke in every reply.'],
 personalitySafety:['В учебных разборах и серьёзных ситуациях юмор отключается. Факты, доступ, диагностика и правила оценивания от этих настроек не зависят.','Humour is suppressed in teaching and serious situations. Facts, access, diagnostics and assessment rules do not depend on these settings.'],
 personalityMemory:['Стиль помнится только пока открыто это окно. Изменение отменяет текущий ответ; прежняя история остаётся до очистки или смены контекста.','Style is remembered only while this window is open. A change stops the current answer; existing history remains until cleared or context changes.'],
 personalityLimits:['Модель может не соблюдать желаемый стиль. Качество общения ещё проверяется.','The model may not reliably follow the requested style. Conversation quality is still being evaluated.'],
 personalityChanged:['Стиль обновлён. Текущий ответ остановлен.','Style updated. The current answer was stopped.'],
 personalityReset:['Вернуть параметры профиля','Reset to profile values'],
 chatNoModel:['Для свободного разговора нужна подключённая языковая модель. Сейчас доступны справка и материалы курса — не буду изображать бесконечный разговор готовыми репликами.','Free conversation requires a connected language model. Help and course materials are available now; I will not simulate an endless conversation with canned replies.'],
 conversation:['Ответ модели · не проверен по материалам курса','Model reply · not verified against course material'],
 chatStart:['Давай поговорим','Let’s talk'],
 chatHelp:['Начните с «Давай поговорим: …». Для объяснений курса или действий Nexus можно вернуться к обычным запросам.','Start with “Let’s talk: …”. Ask about your course or a Nexus action to return to the usual assistance.']
};
export function personalityText(locale,key){return rows[key]?.[locale==='en'?1:0]??key;}
