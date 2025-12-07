---
"agentxjs": patch
"@agentxjs/runtime": patch
"@agentxjs/ui": patch
"@agentxjs/portagent": patch
---

fix: remove private packages from npm dependencies

- Move internal packages to devDependencies
- Bundle via tsup noExternal config
- Fixes npm install errors for end users
