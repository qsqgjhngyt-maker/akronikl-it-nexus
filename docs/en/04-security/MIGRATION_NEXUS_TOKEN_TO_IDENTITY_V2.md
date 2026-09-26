# Migration — nexus-token to Identity v2

Use additive/parallel migration:
1. add Identity v2 schema;
2. support legacy token + new session;
3. current owner proves token control and links provider/passkey;
4. switch UI to Identity v2;
5. revoke legacy token only after verified recovery path;
6. later remove normal-user token dependency.

Project/workspace identities remain stable.
