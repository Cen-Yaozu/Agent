# Testing Quick Reference

## Run Tests

```bash
# All tests (uses MockProvider by default)
pnpm test

# Specific feature
pnpm test dist/features/agent-messaging.feature

# With debug logs
DEBUG_TESTS=1 pnpm test

# Watch mode
pnpm test:watch

# Integration tests with real Claude API
# Option 1: Auto-detect from .env.test (recommended)
#   1. Copy .env.test.example to .env.test
#   2. Fill in ANTHROPIC_AUTH_TOKEN and ANTHROPIC_BASE_URL
#   3. Run tests normally
pnpm test

# Option 2: Manual override with environment variable
TEST_MODE=integration ANTHROPIC_AUTH_TOKEN=xxx ANTHROPIC_BASE_URL=xxx pnpm test
```

## Test Status

✅ **42/42 tests passing (100%)**

### Features Tested

| Feature | Tests | Status |
|---------|-------|--------|
| agent-configuration.feature | 9 | ✅ |
| agent-messaging.feature | 7 | ✅ |
| agent-events.feature | 8 | ✅ |
| agent-lifecycle.feature | 8 | ✅ |
| error-handling.feature | 10 | ✅ |

## Test Architecture

```
Feature Files (Gherkin)
    ↓
Step Definitions (TypeScript)
    ↓
Test Helpers (MockProvider, createTestAgent)
    ↓
Agent Implementation
```

## Key Files

- `tests/README.md` - Complete testing guide
- `tests/steps/*.steps.ts` - Step definitions
- `tests/mocks/MockProvider.ts` - Mock Claude API
- `tests/helpers/` - Shared utilities
- `dist/features/*.feature` - Test scenarios (Gherkin)

## Debug Mode

Enable detailed logging to troubleshoot test failures:

```bash
DEBUG_TESTS=1 pnpm test
```

Shows:
- Handler registrations
- Event emissions
- Agent operations
- Step execution flow

## Common Issues

### "Agent not initialized"
- Feature file missing `Background` section
- Add: `Given I have created an agent`

### "No step definition found"
- Step definition doesn't match feature file
- Check exact wording and parameters

### Events not captured
- Register handlers before emitting events
- Use Background or Given steps

## Adding New Tests

1. **Write feature file** in `packages/agentx-api/features/`
2. **Create step definitions** in `tests/steps/`
3. **Build**: `pnpm build`
4. **Test**: `pnpm test dist/features/your-feature.feature`

See `tests/README.md` for detailed guide.
