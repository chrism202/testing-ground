import { jobService } from '../../services/jobService';
import { weeklyReportHandler } from './weeklyReport';
import { documentIndexHandler } from './documentIndex';
import { dataExportHandler } from './dataExport';
import { logger } from '../../config';

/**
 * Register all job handlers
 */
export function registerJobHandlers(): void {
  logger.info('Registering job handlers...');

  jobService.registerHandler('weekly_report', weeklyReportHandler);
  jobService.registerHandler('doc_index', documentIndexHandler);
  jobService.registerHandler('data_export', dataExportHandler);

  logger.info('Job handlers registered', {
    types: jobService.getRegisteredTypes()
  });
}

export { weeklyReportHandler } from './weeklyReport';
export { documentIndexHandler } from './documentIndex';
export { dataExportHandler } from './dataExport';
