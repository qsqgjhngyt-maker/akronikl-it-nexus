# Account Linking Security

- explicit authenticated action only;
- bind link transaction to account/session/provider;
- unique `(provider, provider_subject)`;
- never auto-merge by email alone;
- cannot unlink the last approved sign-in/recovery path;
- security audit all link/unlink events.
