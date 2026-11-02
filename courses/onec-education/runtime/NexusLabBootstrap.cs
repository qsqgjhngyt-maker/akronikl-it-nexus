// Собственный проверяющий модуль Nexus. Платформа/лицензии 1С не включены.
// Только Windows Sandbox: проверка снимка и новая копия; BSL не исполняется.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Management;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

[DataContract] public class LabFile {
 [DataMember] public string path;
 [DataMember] public long bytes;
 [DataMember] public string sha256;
}
[DataContract] public class LabJob {
 [DataMember] public int schemaVersion;
 [DataMember] public string jobId;
 [DataMember] public string workId;
 [DataMember] public long sourceRevision;
 [DataMember] public string courseId;
 [DataMember] public string topicId;
 [DataMember] public string sourceSnapshotSha256;
 [DataMember] public LabFile[] files;
}
public static class NexusLabBootstrap {
 const string Input = @"C:\NexusInput";
 static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);
 internal static string Digest(byte[] data) { using (SHA256 h=SHA256.Create()) return BitConverter.ToString(h.ComputeHash(data)).Replace("-", "").ToLowerInvariant(); }
 internal static void Require(bool value, string code) { if (!value) throw new InvalidOperationException(code); }
 internal static void GuardGuest() {
  Require(String.Equals(Environment.UserName,"WDAGUtilityAccount",StringComparison.OrdinalIgnoreCase),"GUEST_IDENTITY_REQUIRED");
  Require(String.Equals(AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\'),Input,StringComparison.OrdinalIgnoreCase),"GUEST_INPUT_REQUIRED");
  bool vm=false;
  using (ManagementObjectSearcher query=new ManagementObjectSearcher("SELECT Model, Manufacturer FROM Win32_ComputerSystem"))
  using (ManagementObjectCollection rows=query.Get()) foreach (ManagementObject row in rows) {
   string model=Convert.ToString(row["Model"]),maker=Convert.ToString(row["Manufacturer"]);
   vm |= model.IndexOf("Virtual Machine",StringComparison.OrdinalIgnoreCase)>=0 && maker.IndexOf("Microsoft",StringComparison.OrdinalIgnoreCase)>=0;
  }
  Require(vm,"MICROSOFT_GUEST_REQUIRED");
  string probe=Path.Combine(Input,".nexus-readonly-probe-"+Guid.NewGuid().ToString("N")); bool writable=false;
  try { using (FileStream f=new FileStream(probe,FileMode.CreateNew,FileAccess.Write,FileShare.None)) writable=true; }
  catch (UnauthorizedAccessException) { }
  finally { if (writable) File.Delete(probe); }
  Require(!writable,"READ_ONLY_INPUT_REQUIRED");
 }
 static bool Reparse(string value) { return (File.GetAttributes(value)&FileAttributes.ReparsePoint)!=0; }
 static string SafePath(string relative) {
  Require(relative!=null && relative.Length>0 && relative.Length<=240 && !Regex.IsMatch(relative,"[\\\\:\"<>|?*\\x00-\\x1f]"),"INVALID_SOURCE_PATH");
  string[] segments=relative.Split('/'); Require(segments.Length<=16,"SOURCE_PATH_DEPTH");
  foreach (string p in segments) Require(p.Length>0 && p!="." && p!=".." && !p.EndsWith(".") && !p.EndsWith(" ") && !Regex.IsMatch(p,@"^(con|prn|aux|nul|com[0-9]|lpt[0-9]|conin\$|conout\$)(\.|$)",RegexOptions.IgnoreCase),"INVALID_WINDOWS_PATH");
  string root=Path.Combine(Input,"source"),full=Path.GetFullPath(Path.Combine(root,relative.Replace('/','\\')));
  Require(full.StartsWith(root+"\\",StringComparison.OrdinalIgnoreCase),"SOURCE_ESCAPE");
  string walk=Input; Require(!Reparse(walk),"SOURCE_REPARSE");
  walk=Path.Combine(walk,"source"); Require(!Reparse(walk),"SOURCE_REPARSE");
  foreach (string segment in segments) { walk=Path.Combine(walk,segment); Require(!Reparse(walk),"SOURCE_REPARSE"); }
  return full;
 }
 internal static LabJob ReadJob(out Dictionary<string,byte[]> verified) {
  string file=Path.Combine(Input,"job.json"); Require(!Reparse(file)&&new FileInfo(file).Length<=65536,"MANIFEST_LIMIT");
  LabJob job; using (FileStream stream=File.OpenRead(file)) job=(LabJob)new DataContractJsonSerializer(typeof(LabJob)).ReadObject(stream);
  Guid id; Require(job!=null && job.schemaVersion==1 && Guid.TryParse(job.jobId,out id),"MANIFEST_SCHEMA");
  Require(job.workId!=null && Regex.IsMatch(job.workId,@"^[a-zA-Z0-9_-]{1,64}$") && job.sourceRevision>=0,"WORK_PROVENANCE");
  Require((job.courseId=="onec"||job.courseId=="1c-enterprise") && job.topicId!=null && job.topicId.StartsWith(job.courseId+".",StringComparison.Ordinal),"COURSE_PROVENANCE");
  Require(job.files!=null && job.files.Length>0 && job.files.Length<=64,"SOURCE_FILE_LIMIT");
  verified=new Dictionary<string,byte[]>(StringComparer.OrdinalIgnoreCase); long total=0; StringBuilder rows=new StringBuilder("[");
  foreach (LabFile row in job.files) {
   Require(row!=null && row.path!=null && !verified.ContainsKey(row.path),"DUPLICATE_SOURCE");
   Require(row.sha256!=null && Regex.IsMatch(row.sha256,"^[a-f0-9]{64}$") && row.bytes>=0 && row.bytes<=1048576,"SOURCE_DESCRIPTOR");
   total+=row.bytes; Require(total<=1048576,"SOURCE_TOTAL_LIMIT");
   string actual=SafePath(row.path); Require(new FileInfo(actual).Length==row.bytes,"SOURCE_SIZE");
   byte[] bytes=File.ReadAllBytes(actual); Require(bytes.LongLength==row.bytes && Digest(bytes)==row.sha256,"SOURCE_HASH"); verified.Add(row.path,bytes);
   if(rows.Length>1) rows.Append(','); rows.Append("{\"path\":\"").Append(row.path).Append("\",\"bytes\":").Append(row.bytes.ToString(CultureInfo.InvariantCulture)).Append(",\"sha256\":\"").Append(row.sha256).Append("\"}");
  }
  rows.Append(']'); Require(Digest(Utf8.GetBytes(rows.ToString()))==job.sourceSnapshotSha256,"SNAPSHOT_HASH"); return job;
 }
 internal static string CreateCopy(LabJob job, Dictionary<string,byte[]> verified) {
  string attempt=Path.Combine(@"C:\NexusGuest","attempt-"+Guid.NewGuid().ToString("N")); Require(!Directory.Exists(attempt),"ATTEMPT_EXISTS");
  Directory.CreateDirectory(attempt); Require(!Reparse(attempt),"COPY_REPARSE");
  foreach (KeyValuePair<string,byte[]> item in verified) {
   string dest=Path.Combine(attempt,"source",item.Key.Replace('/','\\')); Directory.CreateDirectory(Path.GetDirectoryName(dest));
   using (FileStream f=new FileStream(dest,FileMode.CreateNew,FileAccess.Write,FileShare.None)) f.Write(item.Value,0,item.Value.Length);
   Require(Digest(File.ReadAllBytes(dest))==Digest(item.Value),"COPY_HASH");
  }
  string receipt="{\"schemaVersion\":1,\"status\":\"VERIFIED_COPY_ONLY\",\"workId\":\""+job.workId+"\",\"sourceRevision\":"+job.sourceRevision.ToString(CultureInfo.InvariantCulture)+",\"sourceSnapshotSha256\":\""+job.sourceSnapshotSha256+"\",\"files\":"+verified.Count.ToString(CultureInfo.InvariantCulture)+",\"inputReadOnlyVerified\":true,\"platformExecuted\":false,\"guestRightsConfirmed\":false,\"automaticGrade\":false,\"progressWritten\":false,\"codeVerifiedServer\":false,\"credentialEligible\":false}";
  File.WriteAllText(Path.Combine(attempt,"receipt.json"),receipt,Utf8); return attempt;
 }
 [STAThread] public static int Main(string[] args) {
  bool probe=args.Length==1 && args[0]=="--host-refusal-probe";
  try {
   GuardGuest(); Require(!probe,"HOST_PROBE_MUST_REFUSE"); Dictionary<string,byte[]> source; LabJob job=ReadJob(out source);
   Application.EnableVisualStyles(); Form form=new Form(); form.Text="Nexus — проверка учебной копии 1С"; form.Width=760; form.Height=420; form.StartPosition=FormStartPosition.CenterScreen;
   TextBox text=new TextBox(); text.Multiline=true; text.ReadOnly=true; text.ScrollBars=ScrollBars.Vertical; text.Dock=DockStyle.Fill; text.Font=new Font("Segoe UI",11); text.Text="Снимок проверен: "+source.Count+" файлов, SHA256 совпали.\r\nВход защищён от записи.\r\nРабота: "+job.workId+"; ревизия "+job.sourceRevision+".\r\n\r\nНи 1С, ни ученический BSL не запускались.\r\nДля выполнения нужна законная установка 1С внутри этой среды.\r\nЗачёт и прогресс не изменяются.";
   Button button=new Button(); button.Text="Создать новую учебную копию"; button.Dock=DockStyle.Bottom; button.Height=48;
   button.Click+=delegate { try { string copy=CreateCopy(job,source); text.AppendText("\r\n\r\nНовая копия: "+copy+"\r\nВсе "+source.Count+" файлов проверены после записи.\r\nИсходник и прежние копии не перезаписаны."); } catch(Exception error) { MessageBox.Show(error.Message,"Nexus: копия не принята"); } };
   form.Controls.Add(text); form.Controls.Add(button); Application.Run(form); return 0;
  } catch(Exception error) {
   string message="Nexus: проверка не принята.\r\n"+error.Message;
   if(probe) { Console.Error.WriteLine(message); return 23; }
   MessageBox.Show(message,"Nexus — отказ проверки",MessageBoxButtons.OK,MessageBoxIcon.Error); return 2;
  }
 }
}
