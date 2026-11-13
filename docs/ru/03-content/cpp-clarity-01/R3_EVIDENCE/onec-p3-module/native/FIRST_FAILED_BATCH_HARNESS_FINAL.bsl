Перем Протокол;
Процедура ЗаписатьФакт(Текст)
    Протокол.ЗаписатьСтроку(Текст);
КонецПроцедуры
Процедура ПриНачалеРаботыСистемы()
    Протокол = Новый ЗаписьТекста("C:/Users/User/.codex/visualizations/2026/11/04/01a1a774-f585-7bb1-ab20-238357b7c5b7/cpp-clarity-r3/onec-p3-module-native-20261108/ACTUAL_NATIVE_qa-all.txt", КодировкаТекста.UTF8);
    ЗаписатьФакт("NEXUS_P3_MODULE_20261108; PLATFORM=8.3.27.2214; OWN_SYNTHETIC_BASE");
    ЗаписатьФакт("BEGIN:contexts-main30");
    Попытка
        Факт = QACase001.QARun();
        ЗаписатьФакт("VALUE:contexts-main30:" + Факт);
        ЗаписатьФакт("END:contexts-main30:OK");
    Исключение
        ЗаписатьФакт("ERROR:contexts-main30:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:contexts-main45");
    Попытка
        Факт = QACase002.QARun();
        ЗаписатьФакт("VALUE:contexts-main45:" + Факт);
        ЗаписатьФакт("END:contexts-main45:OK");
    Исключение
        ЗаписатьФакт("ERROR:contexts-main45:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:contexts-independent45");
    Попытка
        Факт = QACase003.QARun();
        ЗаписатьФакт("VALUE:contexts-independent45:" + Факт);
        ЗаписатьФакт("END:contexts-independent45:OK");
    Исключение
        ЗаписатьФакт("ERROR:contexts-independent45:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:contexts-independent0");
    Попытка
        Факт = QACase004.QARun();
        ЗаписатьФакт("VALUE:contexts-independent0:" + Факт);
        ЗаписатьФакт("END:contexts-independent0:OK");
    Исключение
        ЗаписатьФакт("ERROR:contexts-independent0:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:contexts-independent120");
    Попытка
        Факт = QACase005.QARun();
        ЗаписатьФакт("VALUE:contexts-independent120:" + Факт);
        ЗаписатьФакт("END:contexts-independent120:OK");
    Исключение
        ЗаписатьФакт("ERROR:contexts-independent120:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:contexts-independent121");
    Попытка
        Факт = QACase006.QARun();
        ЗаписатьФакт("VALUE:contexts-independent121:" + Факт);
        ЗаписатьФакт("END:contexts-independent121:OK");
    Исключение
        ЗаписатьФакт("ERROR:contexts-independent121:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:params-main30");
    Попытка
        Факт = QACase007.QARun();
        ЗаписатьФакт("VALUE:params-main30:" + Факт);
        ЗаписатьФакт("END:params-main30:OK");
    Исключение
        ЗаписатьФакт("ERROR:params-main30:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:params-main45");
    Попытка
        Факт = QACase008.QARun();
        ЗаписатьФакт("VALUE:params-main45:" + Факт);
        ЗаписатьФакт("END:params-main45:OK");
    Исключение
        ЗаписатьФакт("ERROR:params-main45:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:params-main0");
    Попытка
        Факт = QACase009.QARun();
        ЗаписатьФакт("VALUE:params-main0:" + Факт);
        ЗаписатьФакт("END:params-main0:OK");
    Исключение
        ЗаписатьФакт("ERROR:params-main0:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:params-mainnegative");
    Попытка
        Факт = QACase010.QARun();
        ЗаписатьФакт("VALUE:params-mainnegative:" + Факт);
        ЗаписатьФакт("END:params-mainnegative:OK");
    Исключение
        ЗаписатьФакт("ERROR:params-mainnegative:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:params-maintext");
    Попытка
        Факт = QACase011.QARun();
        ЗаписатьФакт("VALUE:params-maintext:" + Факт);
        ЗаписатьФакт("END:params-maintext:OK");
    Исключение
        ЗаписатьФакт("ERROR:params-maintext:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:params-two-calls");
    Попытка
        Факт = QACase012.QARun();
        ЗаписатьФакт("VALUE:params-two-calls:" + Факт);
        ЗаписатьФакт("END:params-two-calls:OK");
    Исключение
        ЗаписатьФакт("ERROR:params-two-calls:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:params-local-conversion");
    Попытка
        Факт = QACase013.QARun();
        ЗаписатьФакт("VALUE:params-local-conversion:" + Факт);
        ЗаписатьФакт("END:params-local-conversion:OK");
    Исключение
        ЗаписатьФакт("ERROR:params-local-conversion:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:params-wrong-no-value");
    Попытка
        Факт = QACase014.QARun();
        ЗаписатьФакт("VALUE:params-wrong-no-value:" + Факт);
        ЗаписатьФакт("END:params-wrong-no-value:OK");
    Исключение
        ЗаписатьФакт("ERROR:params-wrong-no-value:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:params-independent45");
    Попытка
        Факт = QACase015.QARun();
        ЗаписатьФакт("VALUE:params-independent45:" + Факт);
        ЗаписатьФакт("END:params-independent45:OK");
    Исключение
        ЗаписатьФакт("ERROR:params-independent45:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:params-independent60");
    Попытка
        Факт = QACase016.QARun();
        ЗаписатьФакт("VALUE:params-independent60:" + Факт);
        ЗаписатьФакт("END:params-independent60:OK");
    Исключение
        ЗаписатьФакт("ERROR:params-independent60:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:params-independent0");
    Попытка
        Факт = QACase017.QARun();
        ЗаписатьФакт("VALUE:params-independent0:" + Факт);
        ЗаписатьФакт("END:params-independent0:OK");
    Исключение
        ЗаписатьФакт("ERROR:params-independent0:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:params-independentbad-discount");
    Попытка
        Факт = QACase018.QARun();
        ЗаписатьФакт("VALUE:params-independentbad-discount:" + Факт);
        ЗаписатьФакт("END:params-independentbad-discount:OK");
    Исключение
        ЗаписатьФакт("ERROR:params-independentbad-discount:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:collections-main");
    Попытка
        Факт = QACase019.QARun();
        ЗаписатьФакт("VALUE:collections-main:" + Факт);
        ЗаписатьФакт("END:collections-main:OK");
    Исключение
        ЗаписатьФакт("ERROR:collections-main:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:collections-third-item");
    Попытка
        Факт = QACase020.QARun();
        ЗаписатьФакт("VALUE:collections-third-item:" + Факт);
        ЗаписатьФакт("END:collections-third-item:OK");
    Исключение
        ЗаписатьФакт("ERROR:collections-third-item:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:collections-alias-add");
    Попытка
        Факт = QACase021.QARun();
        ЗаписатьФакт("VALUE:collections-alias-add:" + Факт);
        ЗаписатьФакт("END:collections-alias-add:OK");
    Исключение
        ЗаписатьФакт("ERROR:collections-alias-add:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:collections-missing-key");
    Попытка
        Факт = QACase022.QARun();
        ЗаписатьФакт("VALUE:collections-missing-key:" + Факт);
        ЗаписатьФакт("END:collections-missing-key:OK");
    Исключение
        ЗаписатьФакт("ERROR:collections-missing-key:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:collections-independent-two");
    Попытка
        Факт = QACase023.QARun();
        ЗаписатьФакт("VALUE:collections-independent-two:" + Факт);
        ЗаписатьФакт("END:collections-independent-two:OK");
    Исключение
        ЗаписатьФакт("ERROR:collections-independent-two:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:collections-independent-one");
    Попытка
        Факт = QACase024.QARun();
        ЗаписатьФакт("VALUE:collections-independent-one:" + Факт);
        ЗаписатьФакт("END:collections-independent-one:OK");
    Исключение
        ЗаписатьФакт("ERROR:collections-independent-one:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:collections-independent-empty");
    Попытка
        Факт = QACase025.QARun();
        ЗаписатьФакт("VALUE:collections-independent-empty:" + Факт);
        ЗаписатьФакт("END:collections-independent-empty:OK");
    Исключение
        ЗаписатьФакт("ERROR:collections-independent-empty:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:collections-wrong-alias");
    Попытка
        Факт = QACase026.QARun();
        ЗаписатьФакт("VALUE:collections-wrong-alias:" + Факт);
        ЗаписатьФакт("END:collections-wrong-alias:OK");
    Исключение
        ЗаписатьФакт("ERROR:collections-wrong-alias:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:exceptions-main-bad");
    Попытка
        Факт = QACase027.QARun();
        ЗаписатьФакт("VALUE:exceptions-main-bad:" + Факт);
        ЗаписатьФакт("END:exceptions-main-bad:OK");
    Исключение
        ЗаписатьФакт("ERROR:exceptions-main-bad:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:exceptions-main-30");
    Попытка
        Факт = QACase028.QARun();
        ЗаписатьФакт("VALUE:exceptions-main-30:" + Факт);
        ЗаписатьФакт("END:exceptions-main-30:OK");
    Исключение
        ЗаписатьФакт("ERROR:exceptions-main-30:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:exceptions-main-negative");
    Попытка
        Факт = QACase029.QARun();
        ЗаписатьФакт("VALUE:exceptions-main-negative:" + Факт);
        ЗаписатьФакт("END:exceptions-main-negative:OK");
    Исключение
        ЗаписатьФакт("ERROR:exceptions-main-negative:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:exceptions-independent-45");
    Попытка
        Факт = QACase030.QARun();
        ЗаписатьФакт("VALUE:exceptions-independent-45:" + Факт);
        ЗаписатьФакт("END:exceptions-independent-45:OK");
    Исключение
        ЗаписатьФакт("ERROR:exceptions-independent-45:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:exceptions-independent-bad");
    Попытка
        Факт = QACase031.QARun();
        ЗаписатьФакт("VALUE:exceptions-independent-bad:" + Факт);
        ЗаписатьФакт("END:exceptions-independent-bad:OK");
    Исключение
        ЗаписатьФакт("ERROR:exceptions-independent-bad:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:exceptions-independent-negative");
    Попытка
        Факт = QACase032.QARun();
        ЗаписатьФакт("VALUE:exceptions-independent-negative:" + Факт);
        ЗаписатьФакт("END:exceptions-independent-negative:OK");
    Исключение
        ЗаписатьФакт("ERROR:exceptions-independent-negative:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:exceptions-independent-zero");
    Попытка
        Факт = QACase033.QARun();
        ЗаписатьФакт("VALUE:exceptions-independent-zero:" + Факт);
        ЗаписатьФакт("END:exceptions-independent-zero:OK");
    Исключение
        ЗаписатьФакт("ERROR:exceptions-independent-zero:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:exceptions-independent-empty");
    Попытка
        Факт = QACase034.QARun();
        ЗаписатьФакт("VALUE:exceptions-independent-empty:" + Факт);
        ЗаписатьФакт("END:exceptions-independent-empty:OK");
    Исключение
        ЗаписатьФакт("ERROR:exceptions-independent-empty:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:exceptions-wrong-success");
    Попытка
        Факт = QACase035.QARun();
        ЗаписатьФакт("VALUE:exceptions-wrong-success:" + Факт);
        ЗаписатьФакт("END:exceptions-wrong-success:OK");
    Исключение
        ЗаписатьФакт("ERROR:exceptions-wrong-success:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:tests-main");
    Попытка
        Факт = QACase036.QARun();
        ЗаписатьФакт("VALUE:tests-main:" + Факт);
        ЗаписатьФакт("END:tests-main:OK");
    Исключение
        ЗаписатьФакт("ERROR:tests-main:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:tests-one-minute");
    Попытка
        Факт = QACase037.QARun();
        ЗаписатьФакт("VALUE:tests-one-minute:" + Факт);
        ЗаписатьФакт("END:tests-one-minute:OK");
    Исключение
        ЗаписатьФакт("ERROR:tests-one-minute:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:tests-wrong-divisor");
    Попытка
        Факт = QACase038.QARun();
        ЗаписатьФакт("VALUE:tests-wrong-divisor:" + Факт);
        ЗаписатьФакт("END:tests-wrong-divisor:OK");
    Исключение
        ЗаписатьФакт("ERROR:tests-wrong-divisor:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:tests-independent");
    Попытка
        Факт = QACase039.QARun();
        ЗаписатьФакт("VALUE:tests-independent:" + Факт);
        ЗаписатьФакт("END:tests-independent:OK");
    Исключение
        ЗаписатьФакт("ERROR:tests-independent:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:tests-independent-wrong-plus");
    Попытка
        Факт = QACase040.QARun();
        ЗаписатьФакт("VALUE:tests-independent-wrong-plus:" + Факт);
        ЗаписатьФакт("END:tests-independent-wrong-plus:OK");
    Исключение
        ЗаписатьФакт("ERROR:tests-independent-wrong-plus:" + ОписаниеОшибки());
    КонецПопытки;
    ЗаписатьФакт("BEGIN:tests-wrong-empty-assertion");
    Попытка
        Факт = QACase041.QARun();
        ЗаписатьФакт("VALUE:tests-wrong-empty-assertion:" + Факт);
        ЗаписатьФакт("END:tests-wrong-empty-assertion:OK");
    Исключение
        ЗаписатьФакт("ERROR:tests-wrong-empty-assertion:" + ОписаниеОшибки());
    КонецПопытки;
    Протокол.Закрыть();
    ЗавершитьРаботуСистемы(Ложь);
КонецПроцедуры
