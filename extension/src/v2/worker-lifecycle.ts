/** Active operations only: Chrome's documented waitUntil pattern resets its 30s idle timer.
 * https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#keep_a_service_worker_alive_until_a_long-running_operation_is_finished
 * 25s is the official example's heartbeat interval, never a workload timeout/capacity ceiling.
 */
export async function withActiveWorker<T>(
  operation: () => Promise<T>,
  pulse: () => Promise<unknown>,
  onPulseFailure: () => void
): Promise<T> {
  const timer = setInterval(() => {
    void pulse().catch(onPulseFailure);
  }, 25_000);
  try {
    return await operation();
  } finally {
    clearInterval(timer);
  }
}
