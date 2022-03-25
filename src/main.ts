const DATA_FETCH_FREQUENCY_MS = 5000;
const BEACON_UPDATE_FREQUENCY_MS = 10_000;

let stopSignalReceived = false;

const handleStopSignal = (signal: string) => {
  console.log(`Signal ${signal} received`);
  console.log('Stopping Airseeeker...');
  // Let the process wait for the last cycles instead of killing it immediately
  stopSignalReceived = true;
};

const fetchData = async () => {
  console.log('Fetching data');
  if (!stopSignalReceived) {
    setTimeout(() => {
      fetchData();
    }, DATA_FETCH_FREQUENCY_MS);
  }
};

const updateBeacons = async () => {
  console.log('Updating beacons');
  if (!stopSignalReceived) {
    setTimeout(() => {
      updateBeacons();
    }, BEACON_UPDATE_FREQUENCY_MS);
  }
};

fetchData();
updateBeacons();

process.on('SIGINT', handleStopSignal);
process.on('SIGTERM', handleStopSignal);
