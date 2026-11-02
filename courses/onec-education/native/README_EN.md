# Native A1/P1 laboratory

This is an original minimal Nexus workspace. It includes no standard vendor configurations or production records. P1 requests exist in memory; actual catalogs and documents belong to later modules.

Tested author environment: Windows, official platform 8.3.27.2214, file infobase, thick client in managed application mode. Public Windows training build 8.3.27.1508 is a separate compatibility target and remains NOT RUN. Do not transfer evidence between builds automatically.

From the repository checkout or portable offline package:

    ./tools/check-onec-native.ps1 -PlatformPath "FULL_PATH_TO_1cv8.exe" -OutputDirectory "NEW_EXPERIMENT_DIRECTORY"

Use your official installation. The gate accepts 8.3.27.x and records the full version. OutputDirectory must not exist. The script does not read your infobase list, add a startup-list entry, request passwords or change existing work. It creates three isolated infobases to verify execution, dump/restore and a deliberate syntax error in a separate workspace. Existing output is rejected.

Manual workflow, one operation followed by verification:

1. Create a new file infobase without a configuration in a new directory. Verify the full platform version and infobase name.
2. Open only this infobase in Designer. Load configuration files from service-desk, then check the configuration.
3. Update database configuration. Never apply this operation to an unknown infobase.
4. Launch 1C:Enterprise mode. Expected message: NEXUS_1C_P1|requests=3|minutes=105|negative=2|PASS. Without an automated startup parameter, the application stays open for observation.
5. Close the user session. Dump the infobase using Designer.
6. Create another new empty infobase, restore the dump there and repeat execution. Compare results and preserve the original.

NATIVE_RESULT.json contains the version, operation exit codes, source hashes and evidence limits. BSL_RESULT.txt and RESTORED_BSL_RESULT.txt contain only synthetic output. Infobases, .dt files and *.private.log stay local and must not be committed. Licensing files and activation details are not collected.

Without an installation, use theory, diagrams and self-checks. They do not execute 1C; your unperformed native lab remains NOT RUN.

Obtain installers from official sources and accept their terms personally. Free acquisition does not establish redistribution rights. P1 requires neither a deployed server nor a paid service.

## PR #62 consolidation into #63

The original service-cost function is retained with its numeric preconditions. Original cases (30/600→300, 60/900→900, 0/600→0) are supplemented by boundaries (1440/0→0, 1440/100000→2400000). The native gate calls the function and writes `NEXUS_1C_SERVICE_COST|normal=3|boundary=2|PASS` separately to `BSL_RESULT.txt.service-cost.txt`; restored execution uses `RESTORED_BSL_RESULT.txt.service-cost.txt`. The previous BSL_RESULT.txt format stays compatible.

This function neither validates arbitrary input nor defines financial rounding policy. Those are separate P2/P3 tasks. Unknown licensing profile and platform architecture remain NOT_INSPECTED in the environment record. Historical native reports from before consolidation are retained separately.
