/**
 * Basic Usage Example
 *
 * Demonstrates how to set up and use the Speech-to-Tasks Translation Layer
 */

import { TranslationLayer, TranslationLayerConfig } from '../index';

async function basicExample() {
  const config: TranslationLayerConfig = {
    maxConcurrentTasks: 3,
    taskTimeout: 30000,
    streamBufferSize: 100,
    enableSmartDetection: true,
    resultIntegrationStrategy: 'inline',
    mcpServerConfig: {
      serverPath: 'npx',
      transport: 'stdio',
      args: ['-y', '@modelcontextprotocol/server-memory'],
    },
  };

  const layer = new TranslationLayer(config);

  layer.onEvent((event) => {
    console.log('Event:', event.type);

    if (event.type === 'task_detected') {
      console.log('  Task detected:', event.task.description);
      console.log('  Intent:', event.task.intent);
    }

    if (event.type === 'task_completed') {
      console.log('  Task completed:', event.task.id);
      console.log('  Result:', event.task.result?.data);
    }

    if (event.type === 'result_integrated') {
      console.log('  Result integrated into conversation:', event.message.content);
    }
  });

  await layer.initialize();
  console.log('Translation layer initialized');

  await layer.processMessage({
    id: 'msg-1',
    timestamp: Date.now(),
    role: 'user',
    content: 'Hey, can you search for the latest news on AI?',
  });

  await layer.processMessage({
    id: 'msg-2',
    timestamp: Date.now(),
    role: 'user',
    content: 'Also, calculate 15 * 23 for me.',
  });

  setTimeout(async () => {
    const stats = layer.getQueueStats();
    console.log('\nQueue Statistics:', stats);

    const history = layer.getHistory(5);
    console.log('\nConversation History:');
    history.forEach(msg => {
      console.log(`[${msg.role}]: ${msg.content}`);
    });

    await layer.shutdown();
    console.log('\nTranslation layer shutdown');
  }, 5000);
}

if (require.main === module) {
  basicExample().catch(console.error);
}
