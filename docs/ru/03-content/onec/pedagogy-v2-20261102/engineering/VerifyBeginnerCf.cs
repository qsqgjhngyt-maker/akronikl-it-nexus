using System;
using System.IO;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
class VerifyBeginnerCf {
 static string Sha(string p){using(var h=SHA256.Create())using(var s=File.OpenRead(p))return BitConverter.ToString(h.ComputeHash(s)).Replace("-","").ToLowerInvariant();}
 static string Q(string p){return "\""+p+"\"";}
 static void Run(string exe,string args,string log){var p=Process.Start(new ProcessStartInfo(exe,args+" /DisableStartupDialogs /DisableStartupMessages /Out "+Q(log)){UseShellExecute=false,CreateNoWindow=true});if(!p.WaitForExit(60000)){p.Kill();throw new Exception("TIMEOUT");}if(p.ExitCode!=0)throw new Exception("NATIVE_EXIT");var text=File.Exists(log)?File.ReadAllText(log):"";if(text.Contains("Ошибка")||text.Contains("Error")||text.Contains("Синтакс"))throw new Exception("DIAGNOSTIC");}
 static int Main(){try{
  var cf=@"C:\NexusCfInput\NexusTrainingServiceDeskV2.cf";if(Sha(cf)!="a71df7d838a982a7939a63557ea456fe5ec47077c69ed33b4638acddb6fefcfd")return 41;
  string exe=null;foreach(var p in new[]{@"C:\Program Files (x86)\1cv8t\8.3.27.1508\bin\1cv8t.exe",@"C:\Program Files\1cv8t\8.3.27.1508\bin\1cv8t.exe"})if(File.Exists(p))exe=p;
  if(exe==null||Sha(exe)!="d52c3feaba002dd2ddbe01c8d4780cda947b99a6831c22d406290dd3dfd7bde4")return 42;
  var dest=@"C:\NexusCfCheck";if(Directory.Exists(dest))return 43;Directory.CreateDirectory(dest);var db=Path.Combine(dest,"base");
  Run(exe,"CREATEINFOBASE "+Q("File=\""+db+"\";"),Path.Combine(dest,"create.log"));
  Run(exe,"DESIGNER /F "+Q(db)+" /LoadCfg "+Q(cf)+" /UpdateDBCfg",Path.Combine(dest,"load.log"));
  Run(exe,"DESIGNER /F "+Q(db)+" /CheckConfig -ThinClient -ThickClientManagedApplication -Server -ConfigLogicalIntegrity",Path.Combine(dest,"check.log"));
  var source=Path.Combine(dest,"source");Directory.CreateDirectory(source);Run(exe,"DESIGNER /F "+Q(db)+" /DumpConfigToFiles "+Q(source),Path.Combine(dest,"dump.log"));
  var module=File.ReadAllText(Path.Combine(source,@"Ext\ManagedApplicationModule.bsl")).Replace("\r\n","\n").Trim();
  var expected=File.ReadAllText(@"C:\NexusCfInput\first-startup-handler.bsl").Replace("\r\n","\n").Trim();if(module!=expected)return 44;
  // Только точный фрагмент из опубликованного исходника + служебное завершение своего сеанса.
  var result=Path.Combine(dest,"executed.txt");var runModule=module.Replace("КонецПроцедуры","    Протокол = Новый ТекстовыйДокумент;\n    Протокол.УстановитьТекст(\"STARTUP_HANDLER_COMPLETED\");\n    Протокол.Записать(\"C:\\NexusCfCheck\\executed.txt\", КодировкаТекста.UTF8);\n    ЗавершитьРаботуСистемы(Ложь);\nКонецПроцедуры");
  File.WriteAllText(Path.Combine(source,@"Ext\ManagedApplicationModule.bsl"),runModule,new UTF8Encoding(false));
  Run(exe,"DESIGNER /F "+Q(db)+" /LoadConfigFromFiles "+Q(source)+" /UpdateDBCfg",Path.Combine(dest,"observer-load.log"));
  Run(exe,"ENTERPRISE /F "+Q(db),Path.Combine(dest,"run.log"));
  if(!File.Exists(result)||File.ReadAllText(result).Trim()!="STARTUP_HANDLER_COMPLETED")return 45;
  return 0;
 }catch{return 49;}}
}
