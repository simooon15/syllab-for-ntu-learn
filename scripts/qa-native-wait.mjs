/** QA only: Playwright waitForFunction treats an unresolved Promise as truthy. */
export async function waitNativeCondition(page, predicate, argument, timeout = 30000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const result = await page.evaluate(predicate, argument);
    if (result === true) return;
    if (Date.now() >= deadline) throw Error("ASYNC_NATIVE_CONDITION_TIMEOUT");
    await page.waitForTimeout(100);
  }
}
