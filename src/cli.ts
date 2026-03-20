#!/usr/bin/env node
import { Command } from './lib/command.js';
import { locale as i18n } from './lib/locale.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = new Command();
  try {
    await command.execute(args);
  } catch (error) {
    if (error instanceof Error && error.name === 'ExitPromptError') {
      console.log('\n👋 Bye!');
      process.exit(0);
    }
    logger.logError('CLI', error);
    console.error(`${i18n.t('cli.error_general')}`, error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
