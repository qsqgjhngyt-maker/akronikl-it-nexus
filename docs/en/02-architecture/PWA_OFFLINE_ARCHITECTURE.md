> **Documentation language policy:** Russian is the normative source. This English version is a secondary mirror for international users. If wording diverges, the Russian version prevails.

# PWA / Offline Architecture

The downloaded shell, installed course content, notes and local progress should remain useful offline. Shell and course-content caches are versioned separately. AI is not an offline requirement by default. Failed updates must not destroy the last working shell. The current baseline cache key `cpp-course-v7-shell-1` is preserved as the starting reference, not the target architecture.
