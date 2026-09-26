# Current Browser Local Data

Storage families:
- `state:v1`: course/skill state;
- `prefs:v1`: UX/language preferences;
- `identity:v1`: local device/principal/account link;
- `projects:v1`: local-first Project Studio DB, schema version 2.

Local project state and cloud project state are distinct. A cloud snapshot is created only through authorized sync.
