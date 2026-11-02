How to do a lab: from installation to an observed result

Study in Nexus and do actual practical work in the official training 1C installed on your PC. Introductory labs need no Studio, JSON requests, source archives or Windows Sandbox. First check which application each step uses.

Download the original training configuration with its report (.cf)

This original training definition (.cf) includes no customer records or 1C platform. Load it only when the lesson calls for the prepared service desk, into a new empty infobase following that lesson. Initial programming exercises can use your own empty infobase without it. Double-clicking .cf does not install 1C. The package includes the original customer report for later lessons. Preserve existing work and follow the continuation instructions for your own infobase.

native/downloads/NexusTrainingServiceDeskReportsV2.cf

1. Open the task in Nexus

Nexus → the lesson → Laboratory

You have selected the intended course and topic.

Read the goal, starting conditions and expected result. Keep the lesson open. Each step identifies its application: Nexus, Designer or 1C:Enterprise.

Know where an action belongs and what observation will satisfy the task.

State the task in your own words, such as creating a customer card or obtaining a total of 75.

Do not enter code in the assistant chat instead of a 1C module. The assistant explains; the application named in the lab performs execution.

2. Obtain the official training platform

Browser → the official 1C page

An appropriate lawfully installed 1C version may already be sufficient.

Use the official training edition link below. Follow 1C’s distribution instructions and select the appropriate system version. Nexus neither includes nor resells the platform installer.

Actual execution needs the official product under appropriate terms of use.

You have the official distribution or an appropriate existing installation.

Use no unknown builds or third-party application configurations. If the selected version requires licensing, use a lawful license or the official training edition. The course provides no protection bypass.

3. Extract and install 1C

Windows → File Explorer → the 1C installer

The distribution was downloaded from its official source.

Open Downloads. For ZIP, right-click the archive → Extract All… → choose a new directory → Extract. Wait, then open the extracted directory. Locate setup.exe according to the distribution instructions and run it. Read the terms and follow the installation wizard. Do not run the installer directly inside an unextracted archive.

Extraction gives the installer access to the distribution files; a ZIP archive is not an installed application.

The 1C launcher is available from Start and opens the infobase list.

If installation is unavailable, read the system message and official requirements. Continue the theory in Nexus meanwhile; enabling Windows Sandbox is unnecessary for introductory labs.

4. Create a separate empty training infobase

The 1C:Enterprise launcher

The platform is installed; choose a new directory that contains none of your previous work.

Select Add… (Добавить…) → Create a new infobase → Next. Choose an infobase without a configuration for developing a new application, rather than another product’s demonstration configuration. Name it clearly, for example «Учебная сервисная служба». Choose local storage and a new directory, then complete the wizard. Exact labels can vary by version.

Keep experiments in your own infobase, distinguishable from other work.

Your training infobase appears in the list; selecting it shows its directory.

If the course infobase exists, compare its name and directory first. An empty customer list is not sufficient reason to create another infobase or replace an existing configuration.

5. Prepare the application in Designer

Launcher → select your training infobase → Designer

Verify that the selected row is your training infobase.

Choose Designer (Конфигуратор). If the tree is hidden, choose Configuration → Open configuration. Follow this lesson’s preparation, such as defining the simple Клиенты catalog or opening the application module. Introductory activities do not require loading the complete engineering template.

Designer changes the application definition; entering customer records is a separate activity.

The intended object properties or module editor shown in the lesson screenshot is open.

Preserve any existing source instead of replacing an entire module with an unrelated example. Use a separate new infobase when the first exercise requires an empty module.

6. Perform the task and run the version being checked

Designer → 1C:Enterprise

Preparation is complete and you have predicted the result.

After changing configuration code or structure, close its user application window. In Designer press Ctrl+S, then F7 to update the database configuration and confirm the intended changes. Start with F5. Enter customer cards in 1C:Enterprise; enter code inside the specified procedure in Designer. Changing ordinary customer records alone does not require F7 again.

The running application needs the new code or structure, whereas ordinary data writes already happen in user mode.

Observe the required list row, saved card, program message or report.

For old output, verify the infobase name, saved source and database configuration update. Do not open several simultaneous user sessions of one infobase in the training edition.

7. Compare and preserve your work

1C:Enterprise and Designer

The actions are performed or a specific mismatch has been found.

Compare actual and expected results. For cards, save and reopen the row. For calculations, preserve the module source and a screenshot of its message. To back up, close the application and use Designer → Administration → Dump infobase… with a new .dt filename. Test restoring in another new infobase while preserving the original.

Source, data, observations and backups serve different purposes; one displayed line is not the entire check.

The original work remains, observations can be shown and a backup has not replaced the source.

Restore .dt through 1C rather than importing it as Studio source. Never keep the only work copy inside temporary Windows.

8. Return to the Nexus self-check

Nexus → the same lesson

You obtained the practical result and preserved your deliverables.

Answer the questions and choose Check understanding. Attest the lab only after doing it yourself, then mark the lesson complete. For a mismatch, return to its step and preserve the observed difference; do not report an expected result as an actual one.

Separate understanding and your report from execution in the external application.

The attempt and completion belong to this course and content revision, awarding no automatic completion in the other course.

Nexus cannot see the external 1C window or automatically verify authorship. Reading theory alone leaves the actual practical run outstanding.

Optional: Studio, source transfer and isolated checks

Use this route when a lab explicitly requires project sources, file transfer or an isolated check. The first customer card and short calculation do not require it.

Official 1C training edition

https://online.1c.ru/catalog/free/28765768/
