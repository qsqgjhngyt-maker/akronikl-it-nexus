# Run your work with official training 1C

Your source remains in Studio. **Prepare official1C run** registers and downloads a separate snapshot. Run it with the personal Windows kit,then use **Import execution report**. Old source revisions remain in the history;import never replaces source,course progress or previous attempts.

Tested architecture: Windows x64. Requirements:Windows11Pro/Enterprise/Education with Windows Sandbox,Node24,an installed.NETFramework compiler,and your separately obtained official training8.3.27.1508 distribution for this personal educational instance. [Official download](https://online.1c.ru/catalog/free/28765768/) and [distribution agreement](https://online.1c.ru/admin/documents/agreement.php?ID=16463663). No real accounting data,foreign configurations,host license keys,paid services or shared classroom server. Nexus does not distribute the platform or installer.

From the same candidate checkout,build into a new directory and run with another new attempt directory:

```powershell
powershell.exe -NoProfile -File tools/check-onec-lab-bootstrap-build.ps1 -OutputDirectory <new-build>
node tools/check-onec-learner-run.mjs <request.json> <new-attempt> <official-media-directory> <new-build> --personal-training
```

The kit verifies its build,media and Microsoft Sandbox CLI. It refuses an already running environment,creates its own disposable VM,installs and verifies the official training platform,then checks the configuration. **Compile only** checks the modules. **Compile and run** also runs the course scenario. The supplied Training Service Desk understands `seed|<internal-result-file>` and exits by itself. Other configurations must finish their own session or reach the time limit.

The guest has one read-only input,4GiB RAM and no network,clipboard,GPU,audio/video or printer sharing. It gets no writable host folder. A Job Object is assigned before process execution;memory,CPU,ordinary descendant processes and execution time are limited. The outside supervisor stops only its own VM on success,failure,cancellation or timeout. A Job Object alone is not a security boundary against a guest administrator or broker-created processes;VM isolation and outside termination remain essential. This is a personal runtime,not a public execution server.

Installation has separate bounded600s dependency/MSI budgets. Learner execution has90s inside the guest and a110s outside watchdog. Sources,databases and raw logs produced inside the guest disappear when it stops. Edit and save source in Studio;do not use the guest as permanent storage.

Import `<new-attempt>/NATIVE_RESULT.json` into Studio. Only bounded status and source/line/column metadata return through the official CLI numeric channel;arbitrary guest files do not return. Imported local reports are untrusted. A completed1C process is not proof of correctness,authorship or course mastery. `outputTrusted=false`,`codeVerifiedServer=false`,`credentialEligible=false`,`progressWritten=false`.

Unknown requests,foreign work IDs,changed trust flags,invalid formats and duplicate results cannot replace a work or history. The separate journal uses the existing account namespace and is included in normal account-data clearing. Shared Identity/runtime contracts are unchanged.

On WindowsHome,Android,iPhone or a browser without the external kit,you can study,edit,save and export work,but official1C does not run inside the browser. A shared cloud service and server-verified grading need separate licensing and acceptance.
