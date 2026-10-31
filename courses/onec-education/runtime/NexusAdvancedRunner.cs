// Только собственный закреплённый QA. Не принимает ученические конфигурации.
using System;using System.IO;using System.Linq;using System.Text;using System.Reflection;using System.Diagnostics;
using System.Collections.Generic;using System.Runtime.Serialization;using System.Runtime.Serialization.Json;
[DataContract] public sealed class AdvancedSource { [DataMember] public AdvancedFile[] files; }
[DataContract] public sealed class AdvancedFile { [DataMember] public string path,sha256,content; [DataMember] public int bytes; }
public static class NexusAdvancedRunner {
 static string attempt,platform,diagnostic="";static int phase=1;static readonly UTF8Encoding Utf8=new UTF8Encoding(false,true);
 static void Need(bool ok,string reason){NexusLabBootstrap.Require(ok,reason);}
 static byte[] Resource(string name){using(Stream s=Assembly.GetExecutingAssembly().GetManifestResourceStream(name)){Need(s!=null,"RESOURCE");using(var m=new MemoryStream()){s.CopyTo(m);return m.ToArray();}}}
 static string Q(string s){Need(s.IndexOfAny(new[]{'"','\r','\n','\0'})<0,"ARGUMENT");return "\""+s+"\"";}
 static void Run(string name,string args){uint code=NexusProcessJob.Execute(platform,args+" /DisableStartupDialogs /DisableStartupMessages /Out "+Q(Path.Combine(attempt,name+".private.log")),attempt,45000);Need(code==0,"STEP_"+name+"_"+code);}
 static void Session(string name,string database,string mode,string user,string casesResource,int count){
  string output=Path.Combine(attempt,name+".txt");Run(name,"ENTERPRISE /F "+Q(database)+(user==null?"":" /N "+Q(user))+" /C "+Q(mode+"|"+output));
  diagnostic=File.ReadAllText(output).Trim();Need(diagnostic=="NEXUS_ADV|PASS|"+count,"RESULT_"+name);
  string[] got=File.ReadAllLines(output+".cases.txt").Where(s=>s.Length>0).OrderBy(s=>s,StringComparer.Ordinal).ToArray();
  string[] want=Utf8.GetString(Resource(casesResource)).TrimStart('\uFEFF').Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries).OrderBy(s=>s,StringComparer.Ordinal).ToArray();
  Need(got.Length==count&&got.SequenceEqual(want),"CASES_"+name);
 }
 [STAThread] public static int Main(string[] args){
  try{
   NexusLabBootstrap.GuardGuest();Need(args.Length==1&&args[0]=="--trusted-advanced-qa","MODE");
   Dictionary<string,byte[]> original;LabJob job=NexusLabBootstrap.ReadJob(out original);Need(job.sourceSnapshotSha256=="af19d9dab9679256247d30ec587fdb392e6ee62010489c5ec488deee155ae17b","REFERENCE");
   TrainingLock locked;using(var s=new MemoryStream(Resource("NexusTrainingLock")))locked=(TrainingLock)new DataContractJsonSerializer(typeof(TrainingLock)).ReadObject(s);
   Need(locked.version=="8.3.27.1508","VERSION");platform=new[]{@"C:\Program Files (x86)\1cv8t\8.3.27.1508\bin\1cv8t.exe",@"C:\Program Files\1cv8t\8.3.27.1508\bin\1cv8t.exe"}.SingleOrDefault(File.Exists);
   Need(platform!=null&&NexusLabBootstrap.Digest(File.ReadAllBytes(platform))==locked.platform.sha256,"PLATFORM_HASH");TrainingAuthenticode.Verify(platform,locked.platform.signerCertificateSha256);
   attempt=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"NexusAdvancedQA",Guid.NewGuid().ToString("N"));Directory.CreateDirectory(attempt);
   string source=Path.Combine(attempt,"source");Directory.CreateDirectory(source);byte[] packed=Resource("NexusAdvancedSource");AdvancedSource spec;
   using(var s=new MemoryStream(packed))spec=(AdvancedSource)new DataContractJsonSerializer(typeof(AdvancedSource)).ReadObject(s);
   Need(spec.files.Length==18,"SOURCE_COUNT");foreach(var f in spec.files){Need(f.path!=null&&!f.path.Contains("..")&&!f.path.Contains(":")&&!f.path.Contains("\\")&&!f.path.StartsWith("/"),"SOURCE_PATH");byte[] bytes=Convert.FromBase64String(f.content);Need(bytes.Length==f.bytes&&NexusLabBootstrap.Digest(bytes)==f.sha256,"SOURCE_HASH");string file=Path.GetFullPath(Path.Combine(source,f.path.Replace('/','\\')));Need(file.StartsWith(source+"\\",StringComparison.OrdinalIgnoreCase),"SOURCE_ESCAPE");Directory.CreateDirectory(Path.GetDirectoryName(file));File.WriteAllBytes(file,bytes);}
   phase=10;string database=Path.Combine(attempt,"base");Run("create","CREATEINFOBASE "+Q("File="+database+";"));phase=11;Run("load","DESIGNER /F "+Q(database)+" /LoadConfigFromFiles "+Q(source)+" /UpdateDBCfg");
   phase=12;Run("check","DESIGNER /F "+Q(database)+" /CheckConfig -ConfigLogIntegrity -ThickClientManagedApplication -Server");
   phase=13;Session("advanced",database,"advanced",null,"NexusAdvancedCases",76);
   phase=14;Session("setup",database,"setup-users",null,"NexusSetupCases",71);
   string snapshot=File.ReadAllText(Path.Combine(attempt,"setup.txt.snapshot.txt"));
   phase=15;Session("reader",database,"reader","NexusQAReader","NexusReaderCases",6);
   phase=16;Session("verify",database,"verify","NexusQAAdmin","NexusAdvancedCases",76);
   phase=17;
   Need(snapshot==File.ReadAllText(Path.Combine(attempt,"verify.txt.snapshot.txt")),"DATABASE_CHANGED_BY_READER");
   foreach(var f in spec.files)Need(NexusLabBootstrap.Digest(File.ReadAllBytes(Path.Combine(source,f.path.Replace('/','\\'))))==f.sha256,"SOURCE_CHANGED");
   return 0;
  }catch{return 100+phase;}
 }
}
