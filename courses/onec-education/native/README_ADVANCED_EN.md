# Advanced Training Service Desk

The original `service-desk-advanced` configuration has18 source files, version1.1.0-advanced-qa. It preserves `service-desk-full`, existing student work, Topic IDs and progress. Always use a separate copy with synthetic customers,services and requests.

`advanced-spec.v1.json` pins file sizes/SHA and exact case IDs. Native runs passed on full1C8.3.27.2214 and official training1C8.3.27.1508 inside an isolated Windows environment. This is not evidence for other versions.

76 native assertions cover the previous70 plus actual data composition (12 rows/440 minutes and an independently checked filter), a created/open managed document form, its control and an unsaved edit that preserves the database. Setup71 creates two synthetic users without passwords or OS authentication in this dedicated training database. Reader6 checks the actual restricted role, RLS `Minutes<=30`, rejection of a query without `ALLOWED`, reading a permitted object and rejection of its write. An administrator then repeats76 checks **without reseeding**; the snapshot must remain unchanged.

From the repository root, build the original verifier:

```powershell
./tools/check-onec-advanced-build.ps1 -OutputDirectory ../advanced-build-new
```

No vendor platform,key or model is included. Host execution must refuse with101. Only inside a prepared personal Windows Sandbox, with readonly `C:\NexusInput`, the pinned original AF reference and a lawfully installed training platform, an operator runs `NexusAdvancedRunner.exe --trusted-advanced-qa`. Exit0 requires all four exact assertion sets and unchanged source/database snapshots.100+phase is a refusal. Do not lower expected counts. Stop only the owned VM and verify cleanup.

This verifier accepts no student code or arbitrary path. It is not a public runner. Sessions are sequential; a Job Object bounds processes/resources/time. No network or host output mapping is required. Client-server concurrency,scheduling/background execution and EDT are not accepted; the prepared background module is not proof of a running job.

See the [PC report](../../../docs/ru/03-content/onec/pc-acceptance-20261101/REPORT_RU.md). Publish only safe case IDs/hashes; keep databases,private logs,activation details and real data private. Reports are local: `codeVerifiedServer=false`, `credentialEligible=false`; no automatic credit or progress writes.
