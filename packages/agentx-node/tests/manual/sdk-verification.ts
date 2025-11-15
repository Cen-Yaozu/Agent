/**
 * Manual SDK Verification Test
 *
 * This is a simple test to verify that the Claude SDK works with our credentials.
 * Run with: pnpm tsx tests/manual/sdk-verification.ts
 */

import { createTestAgent } from "../helpers/testAgent";
import { testEnv, logTestEnvironment } from "../helpers/testEnv";

async function main() {
  console.log("\n=== SDK Verification Test ===\n");
  logTestEnvironment();
  console.log();

  if (!testEnv.useRealAPI) {
    console.log("❌ No real API credentials found in .env.test");
    console.log("   This test requires real Claude API credentials.");
    process.exit(1);
  }

  console.log("📝 Creating agent...");
  const agent = createTestAgent();
  console.log(`✅ Agent created: ${agent.id}`);
  console.log(`   Session ID: ${agent.sessionId}\n`);

  // Listen for all events
  const events: any[] = [];

  agent.on("system", (event) => {
    console.log(`🔧 [system] ${event.subtype}`);
    events.push(event);
  });

  agent.on("user", (event) => {
    console.log(`👤 [user] ${event.message.content.substring(0, 50)}...`);
    events.push(event);
  });

  agent.on("stream_event", (event) => {
    if (event.streamEventType === "content_block_delta" && event.delta?.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
    events.push(event);
  });

  agent.on("assistant", (event) => {
    console.log(`\n🤖 [assistant] Message received (${typeof event.message.content})`);
    events.push(event);
  });

  agent.on("result", (event) => {
    console.log(`\n📊 [result] ${event.subtype}`);
    if (event.subtype === "success") {
      console.log(`   Duration: ${event.durationMs}ms`);
      console.log(`   Tokens: ${event.usage.input} input, ${event.usage.output} output`);
      console.log(`   Cost: $${event.totalCostUsd.toFixed(4)}`);
    } else {
      console.log(`   Error: ${event.error?.message}`);
    }
    events.push(event);
  });

  console.log("💬 Sending message: 'Hello! Please respond with a simple greeting.'\n");

  try {
    await agent.send("Hello! Please respond with a simple greeting.");
    console.log("\n\n✅ Message sent successfully!");
    console.log(`\n📈 Total events received: ${events.length}`);
    console.log("\nEvent types:");
    const eventCounts = events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(eventCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  } catch (error) {
    console.error("\n\n❌ Error during send:", error);
    console.log(`\n📈 Events received before error: ${events.length}`);
    process.exit(1);
  } finally {
    agent.destroy();
    console.log("\n🧹 Agent destroyed\n");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
