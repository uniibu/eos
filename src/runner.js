import logger from './logger';
export default async function runMain(main) {

  /**
   * Helper to display `unhandledRejection` rejection errors.
   */
  process.on("unhandledRejection", (error) => {
    logger.error(error)
    throw error
  })
  try {
    const engine = await main();
    process.on('SIGINT', () => {
      logger.info('exiting')
      engine.stop().then(process.exit)
    });
  } catch (error) {
    logger.error(error)
    process.exit(1)
  }
}
