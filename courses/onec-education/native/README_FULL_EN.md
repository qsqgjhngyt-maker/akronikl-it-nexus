# Full-course native 1C reference stand

Confirmed supplement, 2026-11-01: the [advanced stand](README_ADVANCED_EN.md) passed native data composition, an open managed form, roles/RLS and denied writes in official training 8.3.27.1508 inside an isolated Windows environment. It is separate from the original reference below. See the [PC evidence report](../../../docs/ru/03-content/onec/pc-acceptance-20261101/REPORT_RU.md) for evidence and limitations.

This original Training Service Desk `1.0.0-rc.1` contains customers,services,requests,periodic rates,turnovers and balances. The package contains no platform binaries,licenses or proprietary configurations. Use synthetic data and separate work copies.

## What execution proves

`tools/check-onec-native-full.ps1` executes the **trusted course reference**,not arbitrary learner code. It requires an officially installed1C8.3.27.x platform and permitted usage. The observed reference is8.3.27.2214,file infobase,thick managed client. Training8.3.27.1508 and isolated guest execution need separate admission;similar versions do not transfer results.

The stand creates3customers,2services and12requests with durations `30,45,15,0,60,20,25,35,40,50,55,65`. C001 has even zero-based positions totaling225;C002 totals215. C003 shares C001’s display name but has another reference and no requests. The total is440minutes.

70core assertions coverBSL,collections/rounding,persisted documents,reference lookup,sorting,parameterized queries,left joins,temporary tables,period boundaries,posting/reposting/reversal,transaction rollback,periodic rates,an actual balance register andJSON. Three additional assertions invoke real`HTTPConnection`against an original loopback mock at`127.0.0.1:8765`:success,HTTP rejection and timeout. This mock is not aStudio bridge and accepts no commands.

These checks do not prove multi-session locking,roles/RLS,managed-form workflows,DCS,scheduling,EDT,untrusted-code isolation or authorship. Those lessons specify separate scenarios/environment requirements;unperformed executions remainNOTRUN.

## Reproduce safely

1. Verify official distribution,exact build and applicable usage terms. Do not accept another owner’s agreement or move installations into aVMwithout established rights.
2. Choose a **nonexistent** output directory. The runner refuses existing destinations and never clears earlier work.
3. In a permittedPowerShell7environment,invoke the runner with`-PlatformPath`pointing to your official`1cv8.exe`and`-OutputDirectory`pointing to the fresh destination. Do not disable execution policy or Windows protection.
4. The runner creates a source infobase,checks configuration,runsseed/repeat/reopen/HTTP,dumps a backup and restores a new copy. Only the copy changes to455minutes;the source is reread at440with the same identities.
5. Separate fresh bases hold a syntax defect and a compilable semantic mutant. Their respective checks must reject both. They are not learner work.
6. Reconcile`NATIVE_FULL_RESULT.json`,case IDs,hashes and snapshots. Process exit0without the complete assertion set is insufficient.

Core success is`NEXUS_FULL|documents=12|minutes=440|checks=70|PASS`;theHTTPsession has73assertions. Copy results use`minutes=455`. Missing output orFAILis never converted intoPASS.

## Your work andStudio

New lessons create a **new** full-templateStudio copy. EarlierA2/P2work keeps its0.2.0template,identity and provenance. The editor saves source,copies and checkpoints;the browser does not executeBSL. Source export excludes platform,account,ACL,tokens and credit.

Modified learner code requires a separately admitted isolated environment. A new infobase on the main computer does not confine arbitrary code to that infobase. Successful trusted-reference execution does not close isolation admission. S2currently registers no native provider or local listener. The editable harness also contains solutions;its local report is not protected grading.

Preserve inputs,expected/observed outputs,versions,case IDs,hashes,copy provenance and negative cases. Final submissions also include an independent change and recovery. `codeVerifiedServer=false`,`credentialEligible=false`;neither course automatically awards completion in the other.

Keep`*.private.log`,`*.private.dt`and infobases local. Commit only reviewed safe summaries,synthetic cases/snapshots and hashes. Exclude activation information,real customer data and passwords. Preserve failed experiments separately with cause and regression.
