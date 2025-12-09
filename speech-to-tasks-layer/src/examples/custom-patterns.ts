/**
 * Custom Task Patterns Example
 *
 * Demonstrates how to add custom task detection patterns
 */

import { TranslationLayer, TaskPattern } from '../index';

async function customPatternsExample() {
  const layer = new TranslationLayer({
    enableSmartDetection: false,
    mcpServerConfig: {
      serverPath: 'npx',
      transport: 'stdio',
      args: ['-y', '@modelcontextprotocol/server-memory'],
    },
  });

  const customPatterns: TaskPattern[] = [
    {
      name: 'weather_query',
      intent: 'get_weather',
      patterns: [
        /(?:what'?s|what is|tell me|show me)\s+the\s+weather\s+(?:in|at|for)\s+(.+?)(?:\.|$|,|\?)/i,
        /weather\s+(?:in|at|for)\s+(.+?)(?:\.|$|,|\?)/i,
      ],
      priority: 'high',
      parameterExtractors: {
        location: (match) => match[1]?.trim(),
      },
    },
    {
      name: 'translation_request',
      intent: 'translate_text',
      patterns: [
        /translate\s+["'](.+?)["']\s+(?:to|into)\s+(.+?)(?:\.|$|,|\?)/i,
        /how do you say\s+["'](.+?)["']\s+in\s+(.+?)(?:\.|$|,|\?)/i,
      ],
      priority: 'medium',
      parameterExtractors: {
        text: (match) => match[1]?.trim(),
        targetLanguage: (match) => match[2]?.trim(),
      },
    },
    {
      name: 'music_control',
      intent: 'control_music',
      patterns: [
        /(?:play|start playing|put on)\s+(.+?)(?:\.|$|,|\?)/i,
        /(?:pause|stop)\s+(?:the\s+)?music/i,
        /(?:skip|next)\s+(?:song|track)/i,
      ],
      priority: 'urgent',
      parameterExtractors: {
        action: (match) => {
          if (match[0].match(/pause|stop/i)) return 'pause';
          if (match[0].match(/skip|next/i)) return 'next';
          return 'play';
        },
        query: (match) => match[1]?.trim(),
      },
    },
  ];

  customPatterns.forEach(pattern => layer.addTaskPattern(pattern));

  layer.onEvent((event) => {
    if (event.type === 'task_detected') {
      console.log('Custom task detected:');
      console.log('  Pattern:', event.task.intent);
      console.log('  Description:', event.task.description);
      console.log('  Parameters:', event.task.parameters);
      console.log('  Priority:', event.task.priority);
    }
  });

  await layer.initialize();

  await layer.processMessage("What's the weather in New York?");
  await layer.processMessage('Translate "hello world" to Spanish');
  await layer.processMessage('Play some jazz music');

  setTimeout(async () => {
    const pendingTasks = layer.getTasksByStatus('pending');
    console.log(`\nDetected ${pendingTasks.length} tasks:`);
    pendingTasks.forEach(task => {
      console.log(`  - ${task.intent}: ${task.description}`);
    });

    await layer.shutdown();
  }, 2000);
}

if (require.main === module) {
  customPatternsExample().catch(console.error);
}
