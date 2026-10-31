// Только ограниченный статус собственного QA job; не канал передачи файлов/логов.
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Security.Principal;
using Microsoft.Win32;
[DataContract] class PublicTrainingStatus {
 [DataMember] public string status;
 [DataMember] public string reason;
 [DataMember] public string sourceSnapshotSha256;
}
public static class NexusTrainingStatus {
 public static int Main(string[] args){try{
  NexusLabBootstrap.GuardGuest();Dictionary<string,byte[]> source;LabJob job=NexusLabBootstrap.ReadJob(out source);
  NexusLabBootstrap.Require(job.sourceSnapshotSha256=="af19d9dab9679256247d30ec587fdb392e6ee62010489c5ec488deee155ae17b","TRUSTED_REFERENCE_ONLY");
  if(args.Length==1&&args[0]=="environment")return new WindowsPrincipal(WindowsIdentity.GetCurrent()).IsInRole(WindowsBuiltInRole.Administrator)?20:21;
  if(args.Length==1&&args[0]=="dependency"){
   foreach(RegistryView view in new RegistryView[]{RegistryView.Registry32,RegistryView.Registry64})using(RegistryKey rootKey=RegistryKey.OpenBaseKey(RegistryHive.LocalMachine,view))using(RegistryKey key=rootKey.OpenSubKey(@"SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x86"))if(key!=null&&Convert.ToInt32(key.GetValue("Installed",0))==1)return 22;return 24;
  }
  Guid id;NexusLabBootstrap.Require(args.Length==1&&Guid.TryParseExact(args[0],"D",out id),"JOB_ID");Guid parsed=Guid.Parse(args[0]);
  string root=Path.Combine(@"C:\NexusGuest","runtime-"+parsed.ToString()),result=Path.Combine(root,"TRAINING_RESULT.json");
  if(File.Exists(result)){
   NexusLabBootstrap.Require(new FileInfo(result).Length<=65536,"PUBLIC_RESULT_LIMIT");PublicTrainingStatus value;
   using(FileStream file=File.OpenRead(result))value=(PublicTrainingStatus)new DataContractJsonSerializer(typeof(PublicTrainingStatus)).ReadObject(file);
   NexusLabBootstrap.Require(value.sourceSnapshotSha256==job.sourceSnapshotSha256,"RESULT_SOURCE");if(value.status!=null&&value.status.StartsWith("AUTOMATED PASS",StringComparison.Ordinal))return 0;
   string reason=value.reason??"";if(reason=="TIMEOUT_vc-runtime")return 80;if(reason=="TIMEOUT_training-install")return 81;string[] known={"AUTHENTICODE","SIGNER_PIN","MEDIA_HASH","VC_INSTALL","MSI_INSTALL","PLATFORM_NOT_FOUND","PLATFORM_HASH","PLATFORM_VERSION","ONEC_STEP_FAILED","TIMEOUT","ASSERTIONS_FAILED","CASE_IDS_FAILED","SYNTAX_REJECTION","SEMANTIC_REJECTION","CANCELLED"};for(int i=0;i<known.Length;i++)if(reason.Contains(known[i]))return 51+i;return 79;
  }
  string[] markers={"installer.private.log","create-source-base.private.log","load.private.log","check.private.log","SEED.txt","backup.private.log","reject-syntax.private.log","semantic-rejection.txt"};
  for(int i=markers.Length-1;i>=0;i--)if(File.Exists(Path.Combine(root,markers[i])))return 11+i;
  string[] media={"1CEnterprise 8 (training).msi","Data1.cab","1049.mst","vc_redist.x86.exe"};
  for(int i=media.Length-1;i>=0;i--)if(File.Exists(Path.Combine(root,"install-media",media[i])))return 30+i;
  return Directory.Exists(root)?10:9;
 }catch{ return 23;}}
}
