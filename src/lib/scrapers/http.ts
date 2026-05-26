const USER_AGENT =
  "RentSF/0.1 (+https://localhost; personal rental search; contact hello@haggard.design)";

export async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetchWithRetry(url, init);
  return response.text();
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithRetry(url, init);
  return response.json() as Promise<T>;
}

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/json;q=0.9,*/*;q=0.8",
          ...(init?.headers ?? {})
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      await delay(500 * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
