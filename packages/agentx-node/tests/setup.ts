/**
 * Vitest Global Setup
 *
 * Runs before all tests to display environment configuration.
 */

import { logTestEnvironment } from "./helpers/testEnv";

// Log test environment at startup
console.log("\n" + "=".repeat(60));
logTestEnvironment();
console.log("=".repeat(60) + "\n");
