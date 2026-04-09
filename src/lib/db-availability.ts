const OFFLINE_MARKERS = [
  "your project has exceeded the data transfer quota",
  "prismaclientinitializationerror",
];

const globalForDbAvailability = globalThis as unknown as {
  databaseUnavailable?: boolean;
};

export function isDatabaseUnavailable() {
  return globalForDbAvailability.databaseUnavailable ?? false;
}

export function markDatabaseUnavailable(error: unknown) {
  const message = error instanceof Error
    ? `${error.name}: ${error.message}`.toLowerCase()
    : String(error).toLowerCase();

  if (OFFLINE_MARKERS.some((marker) => message.includes(marker))) {
    globalForDbAvailability.databaseUnavailable = true;
  }
}

export function resetDatabaseAvailabilityForTests() {
  globalForDbAvailability.databaseUnavailable = false;
}
