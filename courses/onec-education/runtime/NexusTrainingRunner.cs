// Операторский QA собственной конфигурации в Windows Sandbox.
// Только закреплённый эталон; не public runner произвольного ученического кода.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[DataContract] public class TrainingFile {
 [DataMember] public string name;
 [DataMember] public long bytes;
 [DataMember] public string sha256;
 [DataMember] public string signerCertificateSha256;
}
[DataContract] public class TrainingPlatform {
 [DataMember] public string fileName;
 [DataMember] public string sha256;
 [DataMember] public string signerCertificateSha256;
}
[DataContract] public class TrainingLock {
 [DataMember] public int schemaVersion;
 [DataMember] public string version;
 [DataMember] public string vcRuntimeMinimumVersion;
 [DataMember] public TrainingFile[] files;
 [DataMember] public TrainingPlatform platform;
}
[DataContract] public class TrainingSpec {
 [DataMember] public string[] caseIds;
 [DataMember] public string[] httpCaseIds;
}
[DataContract] public class TrainingStep {
 [DataMember] public string step;
 [DataMember] public int exitCode;
 [DataMember] public bool expectedFailure;
}
[DataContract] public class TrainingResult {
 [DataMember] public string status;
 [DataMember] public string reason;
 [DataMember] public string platformVersion;
 [DataMember] public string runtimeJobId;
 [DataMember] public string sourceSnapshotSha256;
 [DataMember] public string sourceWorkId;
 [DataMember] public long sourceRevision;
 [DataMember] public int coreCases;
 [DataMember] public int httpCases;
 [DataMember] public int positiveSessions;
 [DataMember] public int sourceMinutes;
 [DataMember] public int copyMinutes;
 [DataMember] public bool syntaxRejected;
 [DataMember] public bool semanticRejected;
 [DataMember] public bool sourcePreserved;
 [DataMember] public bool trainingBuildTested;
 [DataMember] public bool trustedReferenceOnly=true;
 [DataMember] public bool untrustedCodeAdmission=false;
 [DataMember] public bool progressWritten=false;
 [DataMember] public bool codeVerifiedServer=false;
 [DataMember] public bool credentialEligible=false;
 [DataMember] public bool onlineRevocationChecked=false;
 [DataMember] public bool securityPolicyChanged=false;
 [DataMember] public TrainingStep[] steps;
}
internal static class TrainingAuthenticode {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct FileInfo {
  public uint size; [MarshalAs(UnmanagedType.LPWStr)] public string path; public IntPtr file; public IntPtr subject;
 }
 [StructLayout(LayoutKind.Sequential)] struct TrustData {
  public uint size; public IntPtr policy,sip; public uint ui,revocation,choice; public IntPtr file;
  public uint state; public IntPtr stateData,url; public uint flags,context; public IntPtr signatures;
 }
 [DllImport("wintrust.dll",ExactSpelling=true,CharSet=CharSet.Unicode)] static extern int WinVerifyTrust(IntPtr window,ref Guid action,ref TrustData data);
 public static void Verify(string path,string certificateSha256) {
  FileInfo file=new FileInfo(); file.size=(uint)Marshal.SizeOf(typeof(FileInfo)); file.path=path;
  IntPtr buffer=Marshal.AllocHGlobal(Marshal.SizeOf(typeof(FileInfo))); Marshal.StructureToPtr(file,buffer,false);
  TrustData data=new TrustData(); data.size=(uint)Marshal.SizeOf(typeof(TrustData)); data.ui=2; data.choice=1; data.file=buffer; data.state=1;
  // Сеть guest отключена: только Windows trust/cache. Ошибка не превращается в PASS.
  data.flags=0x1000; Guid action=new Guid("00AAC56B-CD44-11d0-8CC2-00C04FC295EE");
  try {
   int result=WinVerifyTrust(new IntPtr(-1),ref action,ref data);
   if(result!=0)throw new InvalidOperationException("AUTHENTICODE_REFUSED_"+result.ToString("X8")+"_"+Path.GetFileName(path));
   using(X509Certificate2 certificate=new X509Certificate2(X509Certificate.CreateFromSignedFile(path)))
    NexusLabBootstrap.Require(certificateSha256!=null?NexusLabBootstrap.Digest(certificate.GetRawCertData())==certificateSha256:certificate.GetNameInfo(X509NameType.SimpleName,false)=="Microsoft Corporation","SIGNER_PIN_MISMATCH");
  } finally {data.state=2; WinVerifyTrust(new IntPtr(-1),ref action,ref data); Marshal.DestroyStructure(buffer,typeof(FileInfo)); Marshal.FreeHGlobal(buffer);}
 }
}
public static class NexusTrainingRunner {
 const string ExpectedSource="af19d9dab9679256247d30ec587fdb392e6ee62010489c5ec488deee155ae17b";
 const string Media=@"C:\NexusInput\TrainingMedia";
 static readonly Encoding Utf8=new UTF8Encoding(false,true);
 static volatile bool cancelled;
 static readonly List<TrainingStep> Steps=new List<TrainingStep>();
 static Form form; static TextBox text; static string attempt,platform,requestedJob; static TrainingSpec spec;
 static void Log(string value) {if(form!=null&&!form.IsDisposed)form.BeginInvoke((Action)delegate{text.AppendText(value+"\r\n");});}
 static T Resource<T>(string name) {using(Stream input=Assembly.GetExecutingAssembly().GetManifestResourceStream(name)){NexusLabBootstrap.Require(input!=null,"RESOURCE_REQUIRED");return(T)new DataContractJsonSerializer(typeof(T)).ReadObject(input);}}
 static string Q(string value){NexusLabBootstrap.Require(value.IndexOfAny(new char[]{'"','\r','\n','\0'})<0,"ARGUMENT_REFUSED");return "\""+value+"\"";}
 static string HashFile(string file){using(FileStream input=File.OpenRead(file))using(SHA256 h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(input)).Replace("-","").ToLowerInvariant();}
 static void StopIfCancelled(){if(cancelled)throw new OperationCanceledException("CANCELLED");}
 static int ProcessJob(string step,string executable,string arguments,int milliseconds,bool negative) {
  StopIfCancelled(); Log("1С / "+step);
  ProcessStartInfo info=new ProcessStartInfo(executable,arguments);info.UseShellExecute=false;info.CreateNoWindow=true;info.WorkingDirectory=attempt;
  using(Process process=Process.Start(info)) {
   Stopwatch clock=Stopwatch.StartNew();
   while(!process.WaitForExit(100)){if(cancelled||clock.ElapsedMilliseconds>milliseconds){try{process.Kill();}catch{}throw new InvalidOperationException(cancelled?"CANCELLED":"TIMEOUT_"+step);}}
   Steps.Add(new TrainingStep{step=step,exitCode=process.ExitCode,expectedFailure=negative});return process.ExitCode;
  }
 }
 static int Onec(string step,string arguments,bool negative=false){
  int exit=ProcessJob(step,platform,arguments+" /DisableStartupDialogs /DisableStartupMessages /Out "+Q(Path.Combine(attempt,step+".private.log")),90000,negative);
  if(!negative)NexusLabBootstrap.Require(exit==0,"ONEC_STEP_FAILED_"+step+"_"+exit);return exit;
 }
 static string NewBase(string name){string file=Path.Combine(attempt,name);NexusLabBootstrap.Require(!Directory.Exists(file),"BASE_EXISTS");Onec("create-"+name,"CREATEINFOBASE "+Q("File="+file+";"));return file;}
 static string Positive(string name,string database,string mode,int minutes,bool http=false){
  string result=Path.Combine(attempt,name+".txt");Onec(name,"ENTERPRISE /F "+Q(database)+" /C "+Q(mode+"|"+result));
  int count=http?73:70;string expected="NEXUS_FULL|documents=12|minutes="+minutes+"|checks="+count+"|PASS";
  NexusLabBootstrap.Require(File.Exists(result)&&File.ReadAllText(result).Trim()==expected,"ASSERTIONS_FAILED_"+name);
  string[] found=File.ReadAllLines(result+".cases.txt").Where(v=>v.Length>0).OrderBy(v=>v,StringComparer.Ordinal).ToArray();
  string[] wanted=(http?spec.caseIds.Concat(spec.httpCaseIds):spec.caseIds).Select(v=>v+"|PASS").OrderBy(v=>v,StringComparer.Ordinal).ToArray();
  NexusLabBootstrap.Require(found.Length==count&&found.SequenceEqual(wanted),"CASE_IDS_FAILED_"+name);
  return File.ReadAllText(result+".snapshot.txt").Trim();
 }
 static void WriteSource(string root,Dictionary<string,byte[]> source){NexusLabBootstrap.Require(!Directory.Exists(root),"SOURCE_COPY_EXISTS");foreach(KeyValuePair<string,byte[]> row in source){string dest=Path.Combine(root,row.Key.Replace('/','\\'));Directory.CreateDirectory(Path.GetDirectoryName(dest));using(FileStream file=new FileStream(dest,FileMode.CreateNew,FileAccess.Write))file.Write(row.Value,0,row.Value.Length);}}
 static bool CompatibleMicrosoftRuntime(Version minimum){
  bool installed=false;foreach(RegistryView view in new RegistryView[]{RegistryView.Registry32,RegistryView.Registry64})using(RegistryKey root=RegistryKey.OpenBaseKey(RegistryHive.LocalMachine,view))using(RegistryKey key=root.OpenSubKey(@"SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x86"))installed|=key!=null&&Convert.ToInt32(key.GetValue("Installed",0))==1;
  if(!installed)return false;
  foreach(string name in new string[]{"msvcp140.dll","vcruntime140.dll"}){string file=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows),"SysWOW64",name);if(!File.Exists(file))return false;FileVersionInfo version=FileVersionInfo.GetVersionInfo(file);Version actual=new Version(version.FileMajorPart,version.FileMinorPart,version.FileBuildPart,version.FilePrivatePart);if(actual.Major!=14||actual.CompareTo(minimum)<0)return false;TrainingAuthenticode.Verify(file,null);}return true;
 }
 static void Install(TrainingLock locked){
  NexusLabBootstrap.Require(locked.schemaVersion==1&&locked.version=="8.3.27.1508"&&locked.files.Length==4,"TRAINING_LOCK");
  foreach(TrainingFile row in locked.files){StopIfCancelled();string file=Path.Combine(Media,row.name);NexusLabBootstrap.Require(Path.GetFileName(row.name)==row.name&&new FileInfo(file).Length==row.bytes&&HashFile(file)==row.sha256,"MEDIA_HASH_"+row.name);if(row.signerCertificateSha256!=null)TrainingAuthenticode.Verify(file,row.signerCertificateSha256);}
  Log("Подписи Windows и SHA дистрибутива подтверждены. Сеть guest отключена.");
  // Windows Installer service должен читать CAB/MST из локального guest-диска,
  // а не из VSMB host mapping. Каждая попытка получает собственную проверенную копию.
  string localMedia=Path.Combine(attempt,"install-media");Directory.CreateDirectory(localMedia);
  foreach(TrainingFile row in locked.files){StopIfCancelled();string local=Path.Combine(localMedia,row.name);File.Copy(Path.Combine(Media,row.name),local,false);NexusLabBootstrap.Require(new FileInfo(local).Length==row.bytes&&HashFile(local)==row.sha256,"MEDIA_HASH_LOCAL_"+row.name);if(row.signerCertificateSha256!=null)TrainingAuthenticode.Verify(local,row.signerCertificateSha256);}
  Version minimum;NexusLabBootstrap.Require(Version.TryParse(locked.vcRuntimeMinimumVersion,out minimum),"VC_VERSION_LOCK");
  if(CompatibleMicrosoftRuntime(minimum))Log("Установленный x86 VC++ совместим:версия и подписи Microsoft проверены.");
  // Два MSI VC++ в offline guest заняли около 121 с каждый; установка имеет
  // отдельный конечный бюджет. Бюджет исполнения заданий (90 с) не расширяется.
  else {int vc=ProcessJob("vc-runtime",Path.Combine(localMedia,"vc_redist.x86.exe"),"/install /quiet /norestart /log "+Q(Path.Combine(attempt,"vc-runtime.private.log")),600000,false);NexusLabBootstrap.Require((vc==0||vc==3010||vc==1638)&&CompatibleMicrosoftRuntime(minimum),"VC_INSTALL_FAILED_"+vc);}
  string msi=Path.Combine(localMedia,"1CEnterprise 8 (training).msi");
  int install=ProcessJob("training-install",Path.Combine(Environment.SystemDirectory,"msiexec.exe"),"/i "+Q(msi)+" /qn /norestart ALLUSERS=1 ADDLOCAL=FileVersion,FileVersion_EN,FileVersion_RU,Languages,EN,RU,Readme,DefLanguages,DEF_RU TRANSFORMS="+Q(Path.Combine(localMedia,"1049.mst"))+" /L*v "+Q(Path.Combine(attempt,"installer.private.log")),600000,false);
  NexusLabBootstrap.Require(install==0||install==3010,"MSI_INSTALL_FAILED_"+install);
  string[] candidates={@"C:\Program Files (x86)\1cv8t\8.3.27.1508\bin\1cv8t.exe",@"C:\Program Files\1cv8t\8.3.27.1508\bin\1cv8t.exe"};
  platform=candidates.SingleOrDefault(File.Exists);NexusLabBootstrap.Require(platform!=null,"TRAINING_PLATFORM_NOT_FOUND");
  NexusLabBootstrap.Require(HashFile(platform)==locked.platform.sha256,"TRAINING_PLATFORM_HASH");TrainingAuthenticode.Verify(platform,locked.platform.signerCertificateSha256);
  NexusLabBootstrap.Require(FileVersionInfo.GetVersionInfo(platform).ProductVersion==locked.version,"PLATFORM_VERSION");
  Log("Установлена отдельная учебная1С "+locked.version+" внутри guest. Host не изменён.");
 }
 sealed class LocalHttp : IDisposable {
  TcpListener listener;Thread thread;
  public LocalHttp(){listener=new TcpListener(IPAddress.Loopback,8765);listener.Start();thread=new Thread(delegate(){try{while(true){TcpClient client=listener.AcceptTcpClient();ThreadPool.QueueUserWorkItem(delegate{using(client){try{client.ReceiveTimeout=5000;NetworkStream stream=client.GetStream();StringBuilder request=new StringBuilder();while(request.Length<8192){int b=stream.ReadByte();if(b<0)break;request.Append((char)b);if(request.ToString().EndsWith("\r\n\r\n"))break;}string route=request.ToString().Split(' ').ElementAtOrDefault(1);int status=route=="/reject"?400:route=="/health"||route=="/slow"?200:404;string body=route=="/health"?"{\"service\":\"nexus-course-mock\",\"status\":\"ok\"}":route=="/reject"?"{\"error\":\"synthetic-rejection\"}":"{\"status\":\"late\"}";if(route=="/slow")Thread.Sleep(2500);byte[] data=Encoding.UTF8.GetBytes(body),header=Encoding.ASCII.GetBytes("HTTP/1.1 "+status+" Result\r\nContent-Type: application/json\r\nContent-Length: "+data.Length+"\r\nConnection: close\r\n\r\n");stream.Write(header,0,header.Length);stream.Write(data,0,data.Length);}catch(IOException){}catch(ObjectDisposedException){}}});}}catch(SocketException){}catch(ObjectDisposedException){}});thread.IsBackground=true;thread.Start();}
  public void Dispose(){listener.Stop();thread.Join(1000);}
 }
 static TrainingResult Execute(LabJob job,Dictionary<string,byte[]> source){
  TrainingLock locked=Resource<TrainingLock>("NexusTrainingLock");spec=Resource<TrainingSpec>("NexusFullSpec");NexusLabBootstrap.Require(spec.caseIds.Length==70&&spec.httpCaseIds.Length==3,"CASE_SPEC");
  TrainingResult report=new TrainingResult{status="FAIL",runtimeJobId=requestedJob??Guid.NewGuid().ToString(),sourceWorkId=job.workId,sourceRevision=job.sourceRevision,sourceSnapshotSha256=job.sourceSnapshotSha256,platformVersion=locked.version};
  attempt=Path.Combine(@"C:\NexusGuest","runtime-"+report.runtimeJobId);NexusLabBootstrap.Require(!Directory.Exists(attempt),"RUNTIME_EXISTS");Directory.CreateDirectory(attempt);
  try {
   Install(locked);string original=Path.Combine(attempt,"source");WriteSource(original,source);
   string database=NewBase("source-base");Onec("load","DESIGNER /F "+Q(database)+" /LoadConfigFromFiles "+Q(original)+" /UpdateDBCfg");
   Onec("check","DESIGNER /F "+Q(database)+" /CheckConfig -ConfigLogIntegrity -ThinClient -ThickClientManagedApplication -Server");
   string seed=Positive("SEED",database,"seed",440);NexusLabBootstrap.Require(Positive("REPEAT_SEED",database,"seed",440)==seed&&Positive("REOPEN",database,"verify",440)==seed,"REFERENCE_IDENTITY");
   using(LocalHttp server=new LocalHttp())NexusLabBootstrap.Require(Positive("HTTP",database,"verify-http",440,true)==seed,"HTTP_CHANGED_DATA");
   string dump=Path.Combine(attempt,"course.private.dt");Onec("backup","DESIGNER /F "+Q(database)+" /DumpIB "+Q(dump));string copy=NewBase("copy-base");Onec("restore","DESIGNER /F "+Q(copy)+" /RestoreIB "+Q(dump));NexusLabBootstrap.Require(Positive("RESTORED",copy,"verify",440)==seed,"RESTORE_IDENTITY");
   string edited=Positive("EDIT_COPY",copy,"edit-copy",455);NexusLabBootstrap.Require(edited!=seed&&Positive("REOPEN_COPY",copy,"verify-copy",455)==edited,"COPY_EDIT");NexusLabBootstrap.Require(Positive("ORIGINAL_PRESERVED",database,"verify",440)==seed,"SOURCE_CHANGED");
   string syntaxSource=Path.Combine(attempt,"syntax-source");WriteSource(syntaxSource,source);File.AppendAllText(Path.Combine(syntaxSource,@"Ext\ManagedApplicationModule.bsl"),"\r\nСообщить(;",Utf8);string syntaxBase=NewBase("syntax-base");Onec("load-syntax","DESIGNER /F "+Q(syntaxBase)+" /LoadConfigFromFiles "+Q(syntaxSource));int syntaxExit=Onec("reject-syntax","DESIGNER /F "+Q(syntaxBase)+" /CheckConfig -ThickClientManagedApplication",true);string syntaxLog=File.ReadAllText(Path.Combine(attempt,"reject-syntax.private.log"));NexusLabBootstrap.Require(syntaxExit!=0&&(syntaxLog.Contains("Ожидается")||syntaxLog.Contains("Синтакс")||syntaxLog.Contains("МодульУправляемогоПриложения")||syntaxLog.Contains("Syntax")),"SYNTAX_REJECTION_NOT_PROVED");
   string semanticSource=Path.Combine(attempt,"semantic-source");WriteSource(semanticSource,source);string module=Path.Combine(semanticSource,@"Ext\ManagedApplicationModule.bsl"),body=File.ReadAllText(module),needle="Возврат Окр(Минуты * Тариф / 60, 2);";NexusLabBootstrap.Require(body.Contains(needle),"MUTATION_NOT_FOUND");File.WriteAllText(module,body.Replace(needle,"Возврат Минуты * Тариф / 60;"),Utf8);string semanticBase=NewBase("semantic-base");Onec("load-semantic","DESIGNER /F "+Q(semanticBase)+" /LoadConfigFromFiles "+Q(semanticSource)+" /UpdateDBCfg");Onec("check-semantic","DESIGNER /F "+Q(semanticBase)+" /CheckConfig -ThickClientManagedApplication");string rejection=Path.Combine(attempt,"semantic-rejection.txt");Onec("reject-semantic","ENTERPRISE /F "+Q(semanticBase)+" /C "+Q("seed|"+rejection));NexusLabBootstrap.Require(File.Exists(rejection)&&File.ReadAllText(rejection).Contains("NEXUS_CHECK_FAILED: P3.numeric-rounding-and-zero"),"SEMANTIC_REJECTION_NOT_PROVED");
   foreach(KeyValuePair<string,byte[]> row in source)NexusLabBootstrap.Require(HashFile(Path.Combine(@"C:\NexusInput\source",row.Key.Replace('/','\\')))==NexusLabBootstrap.Digest(row.Value),"INPUT_CHANGED");
   report.status="AUTOMATED PASS / official training inside isolated guest";report.coreCases=70;report.httpCases=3;report.positiveSessions=8;report.sourceMinutes=440;report.copyMinutes=455;report.syntaxRejected=true;report.semanticRejected=true;report.sourcePreserved=true;report.trainingBuildTested=true;Log("PASS:70 core +3 HTTP;8 sessions;source440/copy455;syntax+semantic rejection.");
  } catch(Exception error){report.reason=error.Message;Log("Проверка не принята: "+error.Message);}
  report.steps=Steps.ToArray();using(FileStream file=new FileStream(Path.Combine(attempt,"TRAINING_RESULT.json"),FileMode.CreateNew,FileAccess.Write))new DataContractJsonSerializer(typeof(TrainingResult)).WriteObject(file,report);Log("Протокол внутри guest: "+attempt+"\\TRAINING_RESULT.json");return report;
 }
 [STAThread] public static int Main(string[] args){
  bool probe=args.Length==1&&args[0]=="--host-refusal-probe";
  try {
   NexusLabBootstrap.GuardGuest();NexusLabBootstrap.Require(!probe,"HOST_PROBE_MUST_REFUSE");Dictionary<string,byte[]> source;LabJob job=NexusLabBootstrap.ReadJob(out source);NexusLabBootstrap.Require(job.sourceSnapshotSha256==ExpectedSource,"TRUSTED_REFERENCE_ONLY");
   if(args.Length==2&&(args[0]=="--batch"||args[0]=="--show-result")){
    Guid id;NexusLabBootstrap.Require(Guid.TryParseExact(args[1],"D",out id),"JOB_ID");requestedJob=id.ToString();
    if(args[0]=="--batch"){
     TrainingResult result=Execute(job,source);if(result.status.StartsWith("AUTOMATED PASS",StringComparison.Ordinal))return 0;
     string reason=result.reason??"";string[] known={"AUTHENTICODE","SIGNER_PIN","MEDIA_HASH","VC_INSTALL","MSI_INSTALL","PLATFORM_NOT_FOUND","PLATFORM_HASH","PLATFORM_VERSION","ONEC_STEP_FAILED","TIMEOUT","ASSERTIONS_FAILED","CASE_IDS_FAILED","SYNTAX_REJECTION","SEMANTIC_REJECTION","CANCELLED"};
     for(int i=0;i<known.Length;i++)if(reason.Contains(known[i]))return 51+i;return 79;
    }
    string resultFile=Path.Combine(@"C:\NexusGuest","runtime-"+requestedJob,"TRAINING_RESULT.json");NexusLabBootstrap.Require(new System.IO.FileInfo(resultFile).Length<=65536,"PUBLIC_RESULT_LIMIT");
    Application.EnableVisualStyles();Form view=new Form();view.Text="Nexus — результат реального запуска1С";view.Width=1000;view.Height=660;TextBox reportText=new TextBox();reportText.Multiline=true;reportText.ReadOnly=true;reportText.ScrollBars=ScrollBars.Vertical;reportText.Dock=DockStyle.Fill;reportText.Font=new Font("Consolas",10);reportText.Text=File.ReadAllText(resultFile);view.Controls.Add(reportText);Application.Run(view);return 0;
   }
   Application.EnableVisualStyles();form=new Form();form.Text="Nexus — учебная1С: установка и настоящий native QA";form.Width=1000;form.Height=620;form.StartPosition=FormStartPosition.CenterScreen;text=new TextBox();text.ReadOnly=true;text.Multiline=true;text.ScrollBars=ScrollBars.Vertical;text.Dock=DockStyle.Fill;text.Font=new Font("Segoe UI",11);text.Text="Только собственный эталон. Работы/прогресс не записываются.\r\n";form.Controls.Add(text);
   Button cancel=new Button();cancel.Text="Остановить проверку";cancel.Height=42;cancel.Dock=DockStyle.Bottom;cancel.Click+=delegate{cancelled=true;Log("Запрошена остановка собственного QA.");};form.Controls.Add(cancel);form.CancelButton=cancel;form.FormClosing+=delegate{cancelled=true;};
   form.Shown+=delegate{ThreadPool.QueueUserWorkItem(delegate{try{Execute(job,source);}catch(Exception error){Log("Отказ: "+error.Message);}});};Application.Run(form);return 0;
  } catch(Exception error){if(probe){Console.Error.WriteLine(error.Message);return 23;}MessageBox.Show(error.Message,"Nexus — отказ допуска");return 2;}
 }
}
