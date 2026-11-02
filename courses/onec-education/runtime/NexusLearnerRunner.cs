// Личный одноразовый Windows Sandbox. Гостевой результат недоверенный:
// не серверная аттестация, не оценка и не разрешение общего сервера.
using System;using System.IO;using System.Text;using System.Linq;using System.Collections.Generic;
using System.Diagnostics;using System.Reflection;using System.Runtime.InteropServices;
using System.Runtime.Serialization;using System.Runtime.Serialization.Json;using System.Text.RegularExpressions;

public sealed class NexusJobLimit : Exception {public NexusJobLimit(string reason):base(reason){}}
public static class NexusProcessJob {
 [StructLayout(LayoutKind.Sequential)] struct BasicLimits {public long processTime,jobTime;public uint flags;public UIntPtr minWorking,maxWorking;public uint processes;public UIntPtr affinity;public uint priority,scheduling;}
 [StructLayout(LayoutKind.Sequential)] struct Counters {public ulong readOps,writeOps,otherOps,readBytes,writeBytes,otherBytes;}
 [StructLayout(LayoutKind.Sequential)] struct Limits {public BasicLimits basic;public Counters io;public UIntPtr processMemory,jobMemory,peakProcess,peakJob;}
 [StructLayout(LayoutKind.Sequential)] struct Cpu {public uint flags,rate;}
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct Startup {public uint cb;public string reserved,desktop,title;public uint x,y,width,height,xChars,yChars,fill,flags;public ushort show,reservedBytes;public IntPtr reservedPtr,input,output,error;}
 [StructLayout(LayoutKind.Sequential)] struct Info {public IntPtr process,thread;public uint processId,threadId;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr CreateJobObject(IntPtr security,string name);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool SetInformationJobObject(IntPtr job,int kind,IntPtr information,uint bytes);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool CreateProcess(string app,StringBuilder command,IntPtr ps,IntPtr ts,bool inherit,uint flags,IntPtr environment,string directory,ref Startup startup,out Info process);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 [DllImport("kernel32.dll",SetLastError=true)]static extern uint ResumeThread(IntPtr thread);
 [DllImport("kernel32.dll",SetLastError=true)]static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool GetExitCodeProcess(IntPtr process,out uint code);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool TerminateJobObject(IntPtr job,uint code);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool TerminateProcess(IntPtr process,uint code);
 [DllImport("kernel32.dll")]static extern bool CloseHandle(IntPtr handle);
 static void Set<T>(IntPtr job,int kind,T value){int size=Marshal.SizeOf(typeof(T));IntPtr p=Marshal.AllocHGlobal(size);try{Marshal.StructureToPtr(value,p,false);if(!SetInformationJobObject(job,kind,p,(uint)size))throw new NexusJobLimit("JOB_CONFIGURATION_REFUSED_"+Marshal.GetLastWin32Error());}finally{Marshal.FreeHGlobal(p);}}
 public static uint Execute(string executable,string arguments,string directory,int deadline){
  IntPtr job=CreateJobObject(IntPtr.Zero,null);if(job==IntPtr.Zero)throw new NexusJobLimit("JOB_CREATE_REFUSED");Info child=new Info();bool assigned=false;
  try{
   Limits limits=new Limits();limits.basic.flags=0x2000|0x0400|0x0200|0x0100|0x0008|0x0004;limits.basic.processes=4;limits.basic.jobTime=TimeSpan.FromSeconds(35).Ticks;limits.processMemory=new UIntPtr(536870912);limits.jobMemory=new UIntPtr(1073741824);Set(job,9,limits);Set(job,15,new Cpu{flags=1|4,rate=5000});
   Startup startup=new Startup();startup.cb=(uint)Marshal.SizeOf(typeof(Startup));
   // Поток не исполняет ни одной инструкции до назначения в Job; breakaway не разрешён.
   if(!CreateProcess(executable,new StringBuilder("\""+executable+"\" "+arguments),IntPtr.Zero,IntPtr.Zero,false,0x00000004|0x08000000,IntPtr.Zero,directory,ref startup,out child))throw new NexusJobLimit("PROCESS_CREATE_REFUSED_"+Marshal.GetLastWin32Error());
   if(!AssignProcessToJobObject(job,child.process))throw new NexusJobLimit("JOB_ASSIGN_REFUSED_"+Marshal.GetLastWin32Error());assigned=true;
   if(ResumeThread(child.thread)==UInt32.MaxValue)throw new NexusJobLimit("PROCESS_RESUME_REFUSED");Stopwatch clock=Stopwatch.StartNew();
   while(true){uint wait=WaitForSingleObject(child.process,100);if(wait==0)break;if(wait!=258)throw new NexusJobLimit("PROCESS_WAIT_REFUSED");if(clock.ElapsedMilliseconds>deadline){TerminateJobObject(job,33);throw new NexusJobLimit("TIME_LIMIT");}}
   uint exit;if(!GetExitCodeProcess(child.process,out exit))throw new NexusJobLimit("PROCESS_STATUS_REFUSED");if(exit==1816||exit==0xC0000044)throw new NexusJobLimit("RESOURCE_LIMIT");return exit;
  }finally{if(child.process!=IntPtr.Zero&&!assigned)TerminateProcess(child.process,35);CloseHandle(job);if(child.thread!=IntPtr.Zero)CloseHandle(child.thread);if(child.process!=IntPtr.Zero)CloseHandle(child.process);}
 }
}
[DataContract] public sealed class LearnerJob {
 [DataMember]public int schemaVersion;[DataMember]public string requestId,workId,courseId,topicId,sourceSnapshotSha256,mode;
 [DataMember]public long sourceRevision,sourceLocalRevision;[DataMember]public LabFile[] files;
}
[DataContract] public sealed class LearnerReceipt {
 [DataMember]public string requestId,launchId,sourceSnapshotSha256,outcome,phase;
 [DataMember]public int code,diagnostic;
 [DataMember]public bool outputTrusted=false,codeVerifiedServer=false,credentialEligible=false,progressWritten=false;
}
public static class NexusLearnerRunner {
 static readonly UTF8Encoding Utf8=new UTF8Encoding(false,true);static string attempt,platform,phase;static Stopwatch clock;static LearnerJob job;
 static void Need(bool value,string reason){NexusLabBootstrap.Require(value,reason);}
 static bool Reparse(string p){return(File.GetAttributes(p)&FileAttributes.ReparsePoint)!=0;}
 static string Quoted(string value){Need(value.IndexOfAny(new[]{'"','\r','\n','\0'})<0,"ARGUMENT_REFUSED");return "\""+value+"\"";}
 static T Read<T>(string path,int max){Need(!Reparse(path)&&new FileInfo(path).Length<=max,"JSON_LIMIT");using(FileStream input=File.OpenRead(path))return(T)new DataContractJsonSerializer(typeof(T)).ReadObject(input);}
 static string SourcePath(string root,string relative){
  Need(relative!=null&&relative.Length>0&&relative.Length<=240&&!Regex.IsMatch(relative,"[\\\\:\"<>|?*\\x00-\\x1f]"),"SOURCE_PATH");string[] parts=relative.Split('/');Need(parts.Length<=16,"SOURCE_DEPTH");
  foreach(string p in parts)Need(p!=""&&p!="."&&p!=".."&&!p.EndsWith(".")&&!p.EndsWith(" ")&&!Regex.IsMatch(p,@"^(con|prn|aux|nul|com[0-9]|lpt[0-9]|conin\$|conout\$)(\.|$)",RegexOptions.IgnoreCase),"SOURCE_WINDOWS_PATH");
  Need(Regex.IsMatch(relative,@"\.(bsl|os|xml|md|txt|json)$",RegexOptions.IgnoreCase),"SOURCE_EXTENSION");string full=Path.GetFullPath(Path.Combine(root,relative.Replace('/','\\')));Need(full.StartsWith(root+"\\",StringComparison.OrdinalIgnoreCase),"SOURCE_ESCAPE");string walk=root;Need(!Reparse(walk),"SOURCE_REPARSE");foreach(string p in parts){walk=Path.Combine(walk,p);Need(!Reparse(walk),"SOURCE_REPARSE");}return full;
 }
 static Dictionary<string,byte[]> ReadSource(string request){
  string parent=@"C:\NexusInput\learner-jobs",root=Path.Combine(parent,request);Need(!Reparse(parent)&&!Reparse(root),"REQUEST_REPARSE");job=Read<LearnerJob>(Path.Combine(root,"job.json"),65536);
  Need(job!=null&&job.schemaVersion==1&&job.requestId==request&&Regex.IsMatch(job.workId??"",@"^[a-zA-Z0-9_-]{1,64}$")&&(job.courseId=="onec"||job.courseId=="1c-enterprise")&&Regex.IsMatch(job.topicId??"",@"^[a-z0-9.-]+$")&&job.topicId.StartsWith(job.courseId+".",StringComparison.Ordinal)&&job.sourceRevision>=0&&job.sourceRevision<=9007199254740991&&job.sourceLocalRevision>=0&&job.sourceLocalRevision<=9007199254740991&&(job.mode=="check"||job.mode=="check-and-run"),"REQUEST_BINDING");
  Need(job.files!=null&&job.files.Length>0&&job.files.Length<=64,"FILE_COUNT");long total=0;var bytes=new Dictionary<string,byte[]>(StringComparer.OrdinalIgnoreCase);StringBuilder rows=new StringBuilder("[");
  foreach(LabFile row in job.files){Need(row!=null&&row.path!=null&&!bytes.ContainsKey(row.path)&&row.bytes>=0&&row.bytes<=262144&&Regex.IsMatch(row.sha256??"",@"^[a-f0-9]{64}$"),"FILE_DESCRIPTOR");total+=row.bytes;Need(total<=1048576,"SOURCE_LIMIT");string sourcePath=SourcePath(Path.Combine(root,"source"),row.path);Need(new FileInfo(sourcePath).Length==row.bytes,"SOURCE_SIZE");byte[] data=File.ReadAllBytes(sourcePath);Need(data.LongLength==row.bytes&&NexusLabBootstrap.Digest(data)==row.sha256,"SOURCE_HASH");string text=Utf8.GetString(data);Need(!text.Contains('\0')&&!text.Contains('\uFFFD')&&(!row.path.EndsWith(".xml",StringComparison.OrdinalIgnoreCase)||!Regex.IsMatch(text,@"<!\s*(DOCTYPE|ENTITY)\b",RegexOptions.IgnoreCase)),"SOURCE_TEXT");bytes.Add(row.path,data);if(rows.Length>1)rows.Append(',');rows.Append("{\"path\":\"").Append(row.path).Append("\",\"bytes\":").Append(row.bytes.ToString(System.Globalization.CultureInfo.InvariantCulture)).Append(",\"sha256\":\"").Append(row.sha256).Append("\"}");}
  rows.Append(']');Need(NexusLabBootstrap.Digest(Utf8.GetBytes(rows.ToString()))==job.sourceSnapshotSha256,"SNAPSHOT_HASH");Need(bytes.ContainsKey("Configuration.xml")&&bytes.ContainsKey("Ext/ManagedApplicationModule.bsl"),"CONFIGURATION_REQUIRED");return bytes;
 }
 static void Platform(){
  TrainingLock locked;using(Stream input=Assembly.GetExecutingAssembly().GetManifestResourceStream("NexusTrainingLock"))locked=(TrainingLock)new DataContractJsonSerializer(typeof(TrainingLock)).ReadObject(input);
  Need(locked.version=="8.3.27.1508","PLATFORM_LOCK");platform=new[]{@"C:\Program Files (x86)\1cv8t\8.3.27.1508\bin\1cv8t.exe",@"C:\Program Files\1cv8t\8.3.27.1508\bin\1cv8t.exe"}.SingleOrDefault(File.Exists);Need(platform!=null&&!Reparse(platform),"PLATFORM_NOT_FOUND");
  Need(NexusLabBootstrap.Digest(File.ReadAllBytes(platform))==locked.platform.sha256&&FileVersionInfo.GetVersionInfo(platform).ProductVersion==locked.version,"PLATFORM_HASH_VERSION");TrainingAuthenticode.Verify(platform,locked.platform.signerCertificateSha256);
 }
 static uint Invoke(string name,string args){phase=name;int left=90000-(int)clock.ElapsedMilliseconds;if(left<=0)throw new NexusJobLimit("TIME_LIMIT");return NexusProcessJob.Execute(platform,args+" /DisableStartupDialogs /DisableStartupMessages /Out "+Quoted(Path.Combine(attempt,name+".private.log")),attempt,Math.Min(45000,left));}
 static int Diagnostic(int kind){
  string file=Path.Combine(attempt,phase+".private.log");if(!File.Exists(file)||new FileInfo(file).Length>1048576)return kind<<29;
  string log=File.ReadAllText(file);Match where=Regex.Match(log,@"\((\d{1,5}),\s*(\d{1,4})\)");int line=0,column=0;if(where.Success){Int32.TryParse(where.Groups[1].Value,out line);Int32.TryParse(where.Groups[2].Value,out column);}int index=Array.FindIndex(job.files,f=>f.path=="Ext/ManagedApplicationModule.bsl"&&log.Contains("МодульУправляемогоПриложения"));return(index+1)|(Math.Min(line,16383)<<7)|(Math.Min(column,255)<<21)|(kind<<29);
 }
 static bool CourseSelfCheckFailed(){string file=Path.Combine(attempt,"learner.private.txt");if(!File.Exists(file))return false;using(FileStream input=File.OpenRead(file)){byte[] data=new byte[65537];int count=0,n;while(count<data.Length&&(n=input.Read(data,count,data.Length-count))>0)count+=n;Need(count<=65536,"SELF_CHECK_OUTPUT_LIMIT");string text=Utf8.GetString(data,0,count).TrimStart('\uFEFF');return text.StartsWith("NEXUS_CHECK_FAILED:",StringComparison.Ordinal)||(text.StartsWith("NEXUS_FULL|FAIL|",StringComparison.Ordinal)&&text.Contains("NEXUS_CHECK_FAILED:"));}}
 static int Execute(string request,string launch){
  Dictionary<string,byte[]> source=ReadSource(request);Platform();attempt=Path.Combine(@"C:\NexusGuest","learner-"+launch);Need(!Directory.Exists(attempt),"ATTEMPT_EXISTS");Directory.CreateDirectory(attempt);Need(!Reparse(attempt),"ATTEMPT_REPARSE");var result=new LearnerReceipt{requestId=request,launchId=launch,sourceSnapshotSha256=job.sourceSnapshotSha256,outcome="POLICY_REJECTED",code=35};
  try{
   string root=Path.Combine(attempt,"source");foreach(var row in source){string dest=Path.Combine(root,row.Key.Replace('/','\\'));Directory.CreateDirectory(Path.GetDirectoryName(dest));using(FileStream output=new FileStream(dest,FileMode.CreateNew,FileAccess.Write))output.Write(row.Value,0,row.Value.Length);Need(NexusLabBootstrap.Digest(File.ReadAllBytes(dest))==NexusLabBootstrap.Digest(row.Value),"COPY_HASH");}
   clock=Stopwatch.StartNew();string database=Path.Combine(attempt,"base");uint exit=Invoke("create","CREATEINFOBASE "+Quoted("File="+database+";"));if(exit!=0)throw new InvalidOperationException("CREATE_FAILED");
   exit=Invoke("load","DESIGNER /F "+Quoted(database)+" /LoadConfigFromFiles "+Quoted(root)+" /UpdateDBCfg");if(exit==0)exit=Invoke("check","DESIGNER /F "+Quoted(database)+" /CheckConfig -ConfigLogIntegrity -ThinClient -ThickClientManagedApplication -Server");
   if(exit!=0){result.outcome="COMPILE_REJECTED";result.code=31;result.diagnostic=Diagnostic(1);}
   else if(job.mode=="check"){result.outcome="CHECK_COMPLETED";result.code=0;}
   else{exit=Invoke("run","ENTERPRISE /F "+Quoted(database)+" /C "+Quoted("seed|"+Path.Combine(attempt,"learner.private.txt")));result.outcome=exit==0?"RUN_COMPLETED":"RUNTIME_REJECTED";result.code=exit==0?0:32;result.diagnostic=exit==0?0:Diagnostic(2);if(exit==0&&CourseSelfCheckFailed()){result.outcome="LOCAL_TEST_REJECTED";result.code=37;result.diagnostic=3<<29;}}
   foreach(var row in source)Need(NexusLabBootstrap.Digest(File.ReadAllBytes(SourcePath(Path.Combine(@"C:\NexusInput\learner-jobs",request,"source"),row.Key)))==NexusLabBootstrap.Digest(row.Value),"INPUT_CHANGED");
  }catch(NexusJobLimit e){result.code=e.Message=="TIME_LIMIT"?33:e.Message=="RESOURCE_LIMIT"?34:35;result.outcome=result.code==33?"TIMED_OUT":result.code==34?"RESOURCE_LIMIT":"POLICY_REJECTED";}catch{result.code=35;result.outcome="POLICY_REJECTED";}
  result.phase=phase??"prepare";using(FileStream output=new FileStream(Path.Combine(attempt,"LOCAL_RESULT.json"),FileMode.CreateNew,FileAccess.Write))new DataContractJsonSerializer(typeof(LearnerReceipt)).WriteObject(output,result);return result.code;
 }
 public static int Main(string[] args){try{
  NexusLabBootstrap.GuardGuest();if(args.Length==1&&args[0]=="--host-refusal-probe")return 23;
  if(args.Length==1&&args[0]=="--ready"){Dictionary<string,byte[]> trusted;LabJob reference=NexusLabBootstrap.ReadJob(out trusted);Need(reference.sourceSnapshotSha256=="af19d9dab9679256247d30ec587fdb392e6ee62010489c5ec488deee155ae17b","INSTALLER_REFERENCE");return 20;}
  Guid request,launch;Need(args.Length==3&&(args[0]=="--run"||args[0]=="--diagnostic")&&Guid.TryParseExact(args[1],"D",out request)&&Guid.TryParseExact(args[2],"D",out launch),"ARGS");string r=Guid.Parse(args[1]).ToString(),l=Guid.Parse(args[2]).ToString();
  if(args[0]=="--diagnostic"){LearnerReceipt value=Read<LearnerReceipt>(Path.Combine(@"C:\NexusGuest","learner-"+l,"LOCAL_RESULT.json"),16384);Need(value.requestId==r&&value.launchId==l&&value.diagnostic>=0,"RESULT_BINDING");return value.diagnostic;}
  using(var single=new System.Threading.Mutex(false,@"Local\NexusOnecLearnerSingleJob")){if(!single.WaitOne(0))return 36;try{return Execute(r,l);}finally{single.ReleaseMutex();}}
 }catch{return args.Length==1&&args[0]=="--host-refusal-probe"?23:35;}}
}
