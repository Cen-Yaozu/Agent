/**
 * Debug multi-turn conversation
 */

import { createAgent } from "../../src/index";

async function testMultiTurn() {
  console.log("\n=== Testing Multi-Turn Conversation ===\n");

  const agent = createAgent({
    apiKey: process.env.ANTHROPIC_AUTH_TOKEN || "",
    baseUrl: process.env.ANTHROPIC_BASE_URL,
    model: "claude-sonnet-4-20250514",
  });

  console.log(`Agent sessionId: ${agent.sessionId}`);
  console.log(`Provider sessionId: ${(agent as any).provider.sessionId}`);
  console.log(`Provider providerSessionId: ${(agent as any).provider.providerSessionId}`);

  // First message
  console.log("\n--- First message: 'My name is Alice' ---");
  agent.on("system", (event) => {
    if (event.subtype === "init") {
      console.log(`System init - SDK session ID: ${event.sessionId}`);
    }
  });

  agent.on("result", (event) => {
    console.log(`Result: ${event.subtype}`);
    if (event.subtype === "success") {
      console.log(`Response: ${event.result.substring(0, 100)}...`);
    } else {
      console.log(`Error: ${event.error?.message}`);
    }
  });

  await agent.send("My name is Alice");

  console.log(`\nAfter first message:`);
  console.log(`  Provider providerSessionId: ${(agent as any).provider.providerSessionId}`);
  console.log(`  Agent messages count: ${agent.messages.length}`);
  console.log(
    `  Provider internal messages count: ${(agent as any).provider.getMessages().length}`
  );

  // Wait a bit
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Second message
  console.log("\n--- Second message: 'What's my name?' ---");
  try {
    await agent.send("What's my name?");

    console.log(`\nAfter second message:`);
    console.log(`  Provider providerSessionId: ${(agent as any).provider.providerSessionId}`);
    console.log(`  Agent messages count: ${agent.messages.length}`);
    console.log(
      `  Provider internal messages count: ${(agent as any).provider.getMessages().length}`
    );
  } catch (error) {
    console.error(`\n❌ Second message failed:`, error);
  }

  agent.destroy();
}

testMultiTurn().catch(console.error);
