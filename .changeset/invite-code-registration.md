---
"@agentxjs/portagent": minor
---

Add invite code validation for user registration

- Add invite code field to registration form (required by default)
- Invite code is validated as today's 00:00:01 Unix timestamp
- Make email field optional during registration
- Add `INVITE_CODE_REQUIRED` environment variable to enable/disable invite code requirement
- Add `/api/auth/config` endpoint for frontend to fetch auth configuration
