/**
 * Debug Event Flow Test
 *
 * Test to investigate:
 * 1. Why user events are missing
 * 2. Why some stream_event.delta are undefined
 */

import { createTestAgent } from "../helpers/testAgent";
import { testEnv, logTestEnvironment } from "../helpers/testEnv";

async function main() {
  console.log("\n=== Event Flow Debug Test ===\n");
  logTestEnvironment();
  console.log();

  if (!testEnv.useRealAPI) {
    console.log("❌ No real API credentials found in .env.test");
    process.exit(1);
  }

  console.log("📝 Creating agent...");
  const agent = createTestAgent();
  console.log(`✅ Agent created: ${agent.id}\n`);

  // Collect ALL events
  const allEvents: any[] = [];

  agent.on("system", (event) => {
    console.log(`\n🔧 [SYSTEM] subtype: ${event.subtype}`);
    allEvents.push({ type: "system", event });
  });

  agent.on("user", (event) => {
    console.log(`\n👤 [USER] message: ${event.message.content.substring(0, 50)}...`);
    allEvents.push({ type: "user", event });
  });

  agent.on("stream_event", (event) => {
    const hasDelta = event.delta !== undefined;
    const deltaType = event.delta?.type || "N/A";
    const text = event.delta?.type === "text_delta" ? event.delta.text : "";

    console.log(`📡 [STREAM_EVENT] type: ${event.streamEventType}, hasDelta: ${hasDelta}, deltaType: ${deltaType}${text ? `, text: "${text}"` : ""}`);
    allEvents.push({ type: "stream_event", event });
  });

  agent.on("assistant", (event) => {
    console.log(`\n🤖 [ASSISTANT] content type: ${typeof event.message.content}`);
    if (Array.isArray(event.message.content)) {
      console.log(`   Content blocks: ${event.message.content.length}`);
      event.message.content.forEach((block: any, i: number) => {
        console.log(`   [${i}] type: ${block.type}, text: ${block.text?.substring(0, 50)}...`);
      });
    }
    allEvents.push({ type: "assistant", event });
  });

  agent.on("result", (event) => {
    console.log(`\n📊 [RESULT] subtype: ${event.subtype}`);
    if (event.subtype === "success") {
      console.log(`   Duration: ${event.durationMs}ms, Tokens: ${event.usage.input}/${event.usage.output}`);
    }
    allEvents.push({ type: "result", event });
  });

  console.log("💬 Sending message: 'Hello, my name is Alice'\n");
  console.log("─".repeat(60));

  try {
    await agent.send("Hello, my name is Alice");

    console.log("\n" + "─".repeat(60));
    console.log("\n📊 Event Summary:");
    console.log(`   Total events: ${allEvents.length}`);

    const counts = allEvents.reduce((acc, { type }) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(counts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Detailed stream_event analysis
    const streamEvents = allEvents.filter(e => e.type === "stream_event");
    console.log(`\n📡 Stream Event Details:`);
    console.log(`   Total stream events: ${streamEvents.length}`);

    const streamTypes = streamEvents.reduce((acc, { event }) => {
      const type = event.streamEventType;
      if (!acc[type]) acc[type] = { count: 0, withDelta: 0, withoutDelta: 0 };
      acc[type].count++;
      if (event.delta !== undefined) {
        acc[type].withDelta++;
      } else {
        acc[type].withoutDelta++;
      }
      return acc;
    }, {} as Record<string, { count: number, withDelta: number, withoutDelta: number }>);

    Object.entries(streamTypes).forEach(([type, stats]) => {
      console.log(`   ${type}: ${stats.count} total (δ:${stats.withDelta}, no-δ:${stats.withoutDelta})`);
    });

    // Check for user events
    const userEvents = allEvents.filter(e => e.type === "user");
    console.log(`\n👤 User Event Analysis:`);
    console.log(`   User events found: ${userEvents.length}`);
    if (userEvents.length === 0) {
      console.log(`   ❌ Problem confirmed: SDK does not emit user events for current messages`);
    }

    console.log("\n💬 Now testing second message to check context...\n");
    console.log("─".repeat(60));

    await agent.send("What's my name?");

    console.log("\n" + "─".repeat(60));
    console.log("\n✅ Test completed!\n");

  } catch (error) {
    console.error("\n\n❌ Error:", error);
  } finally {
    agent.destroy();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
