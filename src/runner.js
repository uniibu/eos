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
    process.on('SIGINT', function() {
      engine.stop().then(process.exit)
    });
  } catch (error) {
    logger.error("An untrapped error occurred.", error)
    process.exit(1)
  }
}