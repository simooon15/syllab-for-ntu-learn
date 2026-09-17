export interface RedirectDetails {
  url: string;
  redirectUrl?: string;
}

export interface RedirectEventPort {
  addListener(listener: (details: RedirectDetails) => void, filter: { urls: string[] }): void;
  removeListener(listener: (details: RedirectDetails) => void): void;
}

type ProbeFetch = (url: string, init: RequestInit) => Promise<Response>;

export async function observeFirstUnapprovedRedirectOrigin(
  requestUrl: string,
  approvedOrigins: ReadonlySet<string>,
  eventPort: RedirectEventPort,
  fetchImpl: ProbeFetch,
  signal?: AbortSignal
): Promise<string | null> {
  const target = new URL(requestUrl);
  if (target.protocol !== "https:" || target.username || target.password) {
    throw new Error("Redirect probe requires a credential-free HTTPS URL");
  }
  let redirectOrigin: string | null = null;
  const listener = (details: RedirectDetails): void => {
    if (!details.redirectUrl) return;
    try {
      const source = new URL(details.url);
      const destination = new URL(details.redirectUrl);
      if (
        ((source.origin === target.origin && source.pathname === target.pathname) ||
          approvedOrigins.has(source.origin)) &&
        destination.protocol === "https:" &&
        !approvedOrigins.has(destination.origin) &&
        redirectOrigin === null
      ) {
        redirectOrigin = destination.origin;
      }
    } catch {
      // Malformed event URLs are ignored and never logged.
    }
  };
  const urls = [
    `${target.origin}${target.pathname.replaceAll("*", "%2A")}*`,
    ...[...approvedOrigins]
      .filter((origin) => origin !== target.origin)
      .map((origin) => `${origin}/*`)
  ];
  eventPort.addListener(listener, { urls });
  try {
    const response = await fetchImpl(requestUrl, {
      method: "GET",
      credentials: "include",
      redirect: "follow",
      cache: "no-store",
      ...(signal ? { signal } : {})
    });
    await response.body?.cancel();
  } catch {
    // A missing destination permission is expected; the redirect event is the result.
  } finally {
    eventPort.removeListener(listener);
  }
  return redirectOrigin;
}
