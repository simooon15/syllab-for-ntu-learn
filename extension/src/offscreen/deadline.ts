/** Bound a local renderer operation without mistaking a timeout for complete coverage. */
export async function withinDeadline<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("VISUAL_RENDER_TIMEOUT")), milliseconds);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
