/**
 * Streaming Conversation Example
 *
 * Simulates a continuous speech-to-speech conversation with task detection and execution
 */

import { TranslationLayer } from '../index';

async function streamingConversationExample() {
  const layer = new TranslationLayer({
    maxConcurrentTasks: 5,
    enableSmartDetection: true,
    resultIntegrationStrategy: 'inline',
    mcpServerConfig: {
      serverPath: 'npx',
      transport: 'stdio',
      args: ['-y', '@modelcontextprotocol/server-memory'],
    },
  });

  const conversationLog: string[] = [];

  layer.onEvent((event) => {
    if (event.type === 'stream_message') {
      conversationLog.push(`[${event.message.role}]: ${event.message.content}`);
    }

    if (event.type === 'task_detected') {
      console.log(`\n🔍 Task Detected: ${event.task.intent}`);
      console.log(`   Description: ${event.task.description}`);
    }

    if (event.type === 'task_started') {
      console.log(`\n⚙️  Task Started: ${event.taskId}`);
    }

    if (event.type === 'task_completed') {
      console.log(`\n✅ Task Completed: ${event.task.id}`);
      console.log(`   Execution time: ${event.task.result?.executionTime}ms`);
    }

    if (event.type === 'result_integrated') {
      console.log(`\n💬 Result integrated into conversation`);
      console.log(`   ${event.message.content}`);
    }

    if (event.type === 'error') {
      console.error(`\n❌ Error: ${event.error.message}`);
    }
  });

  await layer.initialize();
  console.log('🚀 Translation layer ready\n');

  const conversation = [
    {
      role: 'user' as const,
      content: "Hi! I'm planning a trip to Tokyo. Can you search for the best time to visit?",
    },
    {
      role: 'assistant' as const,
      content: "Sure! Let me search for information about the best time to visit Tokyo.",
    },
    {
      role: 'user' as const,
      content: 'Also, remind me to book the flight in two days.',
    },
    {
      role: 'assistant' as const,
      content: "I'll set a reminder for you to book the flight.",
    },
    {
      role: 'user' as const,
      content: 'What is 1500 USD in Japanese Yen? And also search for budget hotels in Shibuya.',
    },
    {
      role: 'assistant' as const,
      content: "I'll calculate the currency conversion and search for hotels for you.",
    },
  ];

  for (const message of conversation) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${message.role.toUpperCase()}: ${message.content}`);
    console.log('='.repeat(60));

    await layer.processMessage({
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      role: message.role,
      content: message.content,
    });

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  setTimeout(async () => {
    console.log('\n\n' + '='.repeat(60));
    console.log('FINAL STATISTICS');
    console.log('='.repeat(60));

    const stats = layer.getQueueStats();
    console.log('\nQueue Stats:');
    console.log(`  Pending: ${stats.pending}`);
    console.log(`  In Progress: ${stats.inProgress}`);
    console.log(`  Completed: ${stats.completed}`);
    console.log(`  Failed: ${stats.failed}`);

    console.log('\n\nFull Conversation History:');
    console.log('='.repeat(60));
    conversationLog.forEach(log => console.log(log));

    await layer.shutdown();
    console.log('\n\n👋 Translation layer shutdown');
  }, 8000);
}

if (require.main === module) {
  streamingConversationExample().catch(console.error);
}
