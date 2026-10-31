// Ограниченный QA Job Object внутри собственного Windows Sandbox.
using System;using System.IO;using System.Diagnostics;using System.Threading;
public static class NexusJobSelfTest {
 public static int Main(string[] args){try{
  NexusLabBootstrap.GuardGuest();if(args.Length==1&&args[0]=="--host-refusal-probe")return 23;
  if(args.Length==1&&args[0]=="--memory"){try{byte[] large=new byte[800*1024*1024];large[large.Length-1]=1;return 41;}catch(OutOfMemoryException){return 42;}}
  Guid id;NexusLabBootstrap.Require(args.Length==2&&Guid.TryParseExact(args[1],"D",out id),"PROBE_ARGS");string key=Guid.Parse(args[1]).ToString(),marker=Path.Combine(@"C:\NexusGuest","job-probe-"+key+".txt"),self=System.Reflection.Assembly.GetExecutingAssembly().Location;
  if(args[0]=="--delayed-marker"){Thread.Sleep(3500);File.WriteAllText(marker,"OWN_TEST_CHILD_SURVIVED");return 0;}
  if(args[0]=="--tree"){using(Process child=Process.Start(new ProcessStartInfo(self,"--delayed-marker "+key){UseShellExecute=false,CreateNoWindow=true})){Thread.Sleep(15000);}return 0;}
  NexusLabBootstrap.Require(args[0]=="--selftest"&&!File.Exists(marker),"PROBE_MODE");Directory.CreateDirectory(@"C:\NexusGuest");bool timed=false;try{NexusProcessJob.Execute(self,"--tree "+key,@"C:\NexusGuest",2200);}catch(NexusJobLimit error){timed=error.Message=="TIME_LIMIT";}NexusLabBootstrap.Require(timed,"TIMEOUT_NOT_PROVED");Thread.Sleep(4200);NexusLabBootstrap.Require(!File.Exists(marker),"CHILD_SURVIVED");uint memory=NexusProcessJob.Execute(self,"--memory",@"C:\NexusGuest",8000);NexusLabBootstrap.Require(memory==42,"MEMORY_LIMIT_NOT_PROVED");File.WriteAllText(Path.Combine(@"C:\NexusGuest","job-probe-"+key+".json"),"{\"status\":\"AUTOMATED PASS\",\"timeout\":true,\"descendantKilled\":true,\"memoryLimit\":true,\"hostSourceWritten\":false}");return 0;
 }catch{return args.Length==1&&args[0]=="--host-refusal-probe"?23:55;}}
}
