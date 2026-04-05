// backend/scheduler.js
// Automatic scheduler to sync OHLC data from Binance every minute

const { syncAllSymbols } = require('./utils/binanceAPI');

let syncInterval = null;
let isRunning = false;

const SYNC_INTERVAL_SECONDS = 10; // Sync every 10 seconds for near real-time updates

/**
 * Start the automatic OHLC data sync
 */
function startScheduler() {
  if (isRunning) {
    console.log('Scheduler is already running');
    return;
  }

  console.log(`Starting OHLC data scheduler (every ${SYNC_INTERVAL_SECONDS} seconds)`);
  isRunning = true;

  // Run initial sync
  syncAllSymbols().catch(error => {
    console.error('Initial sync failed:', error.message);
  });

  // Set up interval for periodic sync
  syncInterval = setInterval(async () => {
    try {
      console.log('Running scheduled OHLC sync...');
      await syncAllSymbols();
      console.log('Scheduled sync completed successfully');
    } catch (error) {
      console.error('Scheduled sync failed:', error.message);
      // Continue running even if one sync fails
    }
  }, SYNC_INTERVAL_SECONDS * 1000); // Convert seconds to milliseconds
}

/**
 * Stop the automatic OHLC data sync
 */
function stopScheduler() {
  if (!isRunning) {
    console.log('Scheduler is not running');
    return;
  }

  console.log('Stopping OHLC data scheduler');
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  isRunning = false;
}

/**
 * Get scheduler status
 */
function getSchedulerStatus() {
  return {
    isRunning,
    intervalMinutes: SYNC_INTERVAL_MINUTES,
    nextSyncIn: isRunning ? `${SYNC_INTERVAL_MINUTES} minute(s)` : 'N/A'
  };
}

/**
 * Manual sync (for testing)
 */
async function manualSync() {
  try {
    console.log('Running manual OHLC sync...');
    await syncAllSymbols();
    console.log('Manual sync completed successfully');
    return { success: true, message: 'Manual sync completed' };
  } catch (error) {
    console.error('Manual sync failed:', error.message);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping scheduler...');
  stopScheduler();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping scheduler...');
  stopScheduler();
  process.exit(0);
});

module.exports = {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  manualSync
};
