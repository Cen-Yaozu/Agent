---
"@agentxjs/runtime": patch
---

fix: properly configure SDK subprocess environment

- Properly copy process.env to ensure PATH is available for SDK subprocess
- Add stderr callback for debugging SDK subprocess errors
