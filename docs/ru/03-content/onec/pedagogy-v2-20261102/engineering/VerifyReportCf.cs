using System;
using System.IO;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
class VerifyReportCf {
 static string Sha(string p){using(var h=SHA256.Create())using(var s=File.OpenRead(p))return BitConverter.ToString(h.ComputeHash(s)).Replace("-","").ToLowerInvariant();}
 static string Q(string p){return "\""+p+"\"";}
 static string Normal(string p){return File.ReadAllText(p).Replace("\r\n","\n").Trim();}
 static void Run(string exe,string args,string log){var p=Process.Start(new ProcessStartInfo(exe,args+" /DisableStartupDialogs /DisableStartupMessages /Out "+Q(log)){UseShellExecute=false,CreateNoWindow=true});if(!p.WaitForExit(60000)){p.Kill();throw new Exception("TIMEOUT");}if(p.ExitCode!=0)throw new Exception("NATIVE_EXIT");var text=File.Exists(log)?File.ReadAllText(log):"";if(text.Contains("Ошибка")||text.Contains("Error")||text.Contains("Синтакс"))throw new Exception("DIAGNOSTIC");}
 static int Main(){try{
  var cf=@"C:\NexusCfInput\NexusTrainingServiceDeskReportsV2.cf";if(Sha(cf)!="909480783e5216917010b50fcef3a2547337212c18dca03ad090f63536939cf0")return 41;
  string exe=null;foreach(var p in new[]{@"C:\Program Files (x86)\1cv8t\8.3.27.1508\bin\1cv8t.exe",@"C:\Program Files\1cv8t\8.3.27.1508\bin\1cv8t.exe"})if(File.Exists(p))exe=p;
  if(exe==null||Sha(exe)!="d52c3feaba002dd2ddbe01c8d4780cda947b99a6831c22d406290dd3dfd7bde4")return 42;
  var dest=@"C:\NexusCfCheck";if(Directory.Exists(dest))return 43;Directory.CreateDirectory(dest);var db=Path.Combine(dest,"base");
  Run(exe,"CREATEINFOBASE "+Q("File=\""+db+"\";"),Path.Combine(dest,"create.log"));
  Run(exe,"DESIGNER /F "+Q(db)+" /LoadCfg "+Q(cf)+" /UpdateDBCfg",Path.Combine(dest,"load.log"));
  Run(exe,"DESIGNER /F "+Q(db)+" /CheckConfig -ThinClient -ThickClientManagedApplication -Server -ConfigLogicalIntegrity",Path.Combine(dest,"check.log"));
  var source=Path.Combine(dest,"source");Directory.CreateDirectory(source);Run(exe,"DESIGNER /F "+Q(db)+" /DumpConfigToFiles "+Q(source),Path.Combine(dest,"dump.log"));
  var modulePath=Path.Combine(source,@"Ext\ManagedApplicationModule.bsl");var module=Normal(modulePath);
  if(module!=Normal(@"C:\NexusCfInput\first-startup-handler.bsl"))return 44;
  var template=Path.Combine(source,@"Reports\ЗаявкиПоКлиентам\Templates\ОсновнаяСхемаКомпоновкиДанных\Ext\Template.xml");
  if(Normal(template)!=Normal(@"C:\NexusCfInput\ReportTemplate.xml"))return 46;
  var result=Path.Combine(dest,"executed.txt");var runModule=module.Replace("КонецПроцедуры","    Протокол = Новый ТекстовыйДокумент;\n    Протокол.УстановитьТекст(\"STARTUP_HANDLER_COMPLETED\");\n    Протокол.Записать(\"C:\\NexusCfCheck\\executed.txt\", КодировкаТекста.UTF8);\n    ЗавершитьРаботуСистемы(Ложь);\nКонецПроцедуры");
  File.WriteAllText(modulePath,runModule,new UTF8Encoding(false));
  Run(exe,"DESIGNER /F "+Q(db)+" /LoadConfigFromFiles "+Q(source)+" /UpdateDBCfg",Path.Combine(dest,"observer-load.log"));
  Run(exe,"ENTERPRISE /F "+Q(db),Path.Combine(dest,"startup-run.log"));
  if(!File.Exists(result)||File.ReadAllText(result).Trim()!="STARTUP_HANDLER_COMPLETED")return 45;
  var harness=@"C:\NexusCfInput\ReportNativeCheck.bsl";
  if(Sha(harness)!="d9dc7df11627d24b99201ea4a6bf99167d55c294146d43895ff54a45e9319dc5")return 47;
  File.Copy(harness,modulePath,true);
  Run(exe,"DESIGNER /F "+Q(db)+" /LoadConfigFromFiles "+Q(source)+" /UpdateDBCfg",Path.Combine(dest,"query-load.log"));
  Run(exe,"DESIGNER /F "+Q(db)+" /CheckConfig -ThinClient -ThickClientManagedApplication -Server -ConfigLogicalIntegrity",Path.Combine(dest,"query-check.log"));
  Run(exe,"ENTERPRISE /F "+Q(db),Path.Combine(dest,"query-run.log"));
  var queryResult=Path.Combine(dest,"report-query-result.txt");
  if(!File.Exists(queryResult)||File.ReadAllText(queryResult).Trim()!="PASS|3|90|2|75")return 48;
  return 0;
 }catch{return 49;}}
}
