/**
 * Raw SDK Debug Test
 *
 * Directly call SDK to see what messages it returns
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { testEnv, logTestEnvironment } from "../helpers/testEnv";

async function main() {
  console.log("\n=== Raw SDK Debug Test ===\n");
  logTestEnvironment();
  console.log();

  if (!testEnv.useRealAPI) {
    console.log("❌ No real API credentials");
    process.exit(1);
  }

  console.log("📝 Calling SDK query directly...\n");

  const q = query({
    prompt: "Say hello",
    options: {
      model: "claude-sonnet-4-20250514",
      includePartialMessages: true,
      // Note: SDK will use internal API key, we can't pass our custom one directly
    },
  });

  let count = 0;
  for await (const msg of q) {
    count++;
    console.log(`\n[${count}] Message type: "${msg.type}"`);
    if (msg.type === "system") {
      console.log(`    Subtype: ${(msg as any).subtype}`);
    }
    if (msg.type === "user") {
      console.log(`    User message: ${JSON.stringify((msg as any).message).substring(0, 100)}`);
    }
    if (msg.type === "stream_event") {
      const event = (msg as any).event;
      console.log(`    Stream event type: ${event.type}`);
    }
  }

  console.log(`\n\n✅ Total messages: ${count}\n`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
