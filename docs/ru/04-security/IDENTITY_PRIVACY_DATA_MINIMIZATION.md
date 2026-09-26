# Identity Privacy & Data Minimization

## Store what Nexus needs
Stable:
- Nexus account id;
- provider + provider subject;
- display profile;
- verified contact attributes only when needed;
- session/device metadata;
- security events.

## Do not copy provider profile wholesale
Do not persist:
- unnecessary birthday/gender/address/contact graph;
- provider access tokens without feature need;
- provider raw ID token forever.

## Display
Homepage should show primarily:
- avatar;
- Nexus nickname;
- sync/account state.

Do not expose phone/email by default on a shared screen.

## AI boundary
Identity data sent to Nexus AI should normally be:
- pseudonymous account id or no id;
- selected profile preference;
- learning context.

Authentication provider details, phone, recovery state and session data are excluded unless a narrowly defined safety/support flow explicitly needs them.
