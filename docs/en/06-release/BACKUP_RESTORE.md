> **Documentation language policy:** Russian is the normative source. This English version is a secondary mirror for international users. If wording diverges, the Russian version prevails.

# Backup / Restore Policy

Before major releases, create a full source snapshot of the exact published base with SHA-256, inventory and restore instructions. Restore into a new folder/branch first, verify hashes and local smoke tests, then replace production. Browser localStorage/PWA state is separate and is not restored by replacing source files.
