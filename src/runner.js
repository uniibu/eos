import * as loggerInit from './logger';
import * as logInstance from './lg';
export default async function runMain(main) {

  const log = await logInstance.default()
  const logger = loggerInit.default(log);
  /**
   * Helper to display `unhandledRejection` rejection errors.
   */
  process.on("unhandledRejection", (error) => {
    logger.error(error)
    throw error
  })
  try {
    logger.info("starting")
    const engine = await main(logger);
    process.on('SIGINT', () => {
      logger.info('exiting')
      engine.stop().then(process.exit)
    });
  } catch (error) {
    logger.error(error)
    process.exit(1)
  }
}
