# Training service desk — A2/P2

Original Nexus configuration `0.2.0-a2p2`. This is a separate workspace; A1/P1 `service-desk/` remains unchanged. No platform installer, vendor configuration or real records are included.

Verified environment: Windows, official 1C 8.3.27.2214, file infobase, thick client in managed application mode. Training build 8.3.27.1508 remains separately NOT RUN; license profile and platform architecture are NOT_INSPECTED. The installation directory does not establish those facts. No server, Cloud/IAM change or paid service is required.

## One new experiment

From the checkout root or a separate copy of the offline package:

    ./tools/check-onec-native-next.ps1 -PlatformPath "FULL_PATH_TO_1cv8.exe" -OutputDirectory "NEW_DIRECTORY"

First verify that the output directory does not exist. The script rejects existing destinations and clears nothing. Use your official installation; acquisition terms are a separate owner check. The script does not inspect other infobases or collect passwords or licensing information.

The gate creates only its own source-base, copy-base, negative-base and semantic-base beneath the new directory. It loads original service-desk-a2p2 XML/BSL, checks the configuration and performs seven positive sessions. It never targets earlier A1/P1 infobases.

## Expected outcomes

- Customers: C001 Alpha, C002 Beta, C003 a different Alpha reference. Services: S001 Diagnostics/600, S002 Setup/900.
- Source documents: A200001 (C001/S001/30/New), A200002 (C002/S002/45/In progress). Total 75 minutes. They persist; posting is disabled.
- Repeated seeding creates no duplicates and does not overwrite existing items. A new session reads the same values.
- Restoration preserves record identity. Separate work has its own workspace ID/alias rather than replacement GUIDs for every document.
- The copy’s second document changes to 60, totaling 90 after reopening. ORIGINAL_PRESERVED separately confirms the source still totals 75.
- Each positive session checks 46 case IDs: 35 P2 and 11 A2. See a2p2-spec.v1.json and SEED.txt.cases.txt.
- Empty customer and negative minutes are rejected without additional documents. CheckConfig rejects a deliberate syntax error. A subtraction mutation passes syntax but produces FAIL|NEXUS_CHECK_FAILED: P2.1.russian-keywords.

The gate’s edited copy-base already totals 90. For your own user practice starting at 75, restore the source dump into **another new infobase**, assign your work a new ID and retain provenance. Do not edit the accepted control source while claiming to preserve it.

## Manual practice: one action, then verification

1. Create a new file infobase at a separate destination and restore your learning dump. Verify its alias and revision.
2. Open Enterprise mode **without a startup parameter**. The test module performs no automatic seeding or writing in this mode.
3. Open catalogs and requests through the Training service desk subsystem. If a command is unavailable, inspect mode and configuration contents rather than opening another person’s infobase. Command positions and labels can vary.
4. Reconcile numbers, codes, references and values after each action. For save/cancel experiments, close and reopen the intended object. Navigation history is not data auditing.
5. Prepare another copy before your own changes. Adding a third request changes count expectations; the fixed gate is intentionally unsuitable for that modified work. Preserve a separate protocol rather than changing the reference.

The automated gate does not prove these manual UI actions. Attest them separately after actual observation. The platform generates standard forms from metadata; browser learning models have no infobase connection.

## Retain evidence

Keep NATIVE_A2P2_RESULT.json, SEED/REOPEN/RESTORED/EDIT_COPY/REOPEN_COPY/ORIGINAL_PRESERVED summaries, cases and snapshots, SEMANTIC_REJECTION, environment details and your work notes. Snapshot UUIDs belong only to synthetic records. Infobases, .dt dumps, private logs, personal paths, licenses and installers stay local and must not enter GitHub.

examples-a2p2/*.bsl contains exact excerpts of the actual executed module, not standalone programs. Functions are invoked by the complete workspace. For your own experiment, first copy the **entire package**, edit that copy only and use another output directory. Added tests or a changed contract require separate acceptance; the old fixed gate cannot award it automatically.

Nexus completion is revision-aware local self-report, not protected assessment. New lessons require their own attempts; older work, attempts and provenance remain. Copying notes across courses transfers no credit. Posting, registers, concurrent transactions, server execution and learner authorship are not established here.
