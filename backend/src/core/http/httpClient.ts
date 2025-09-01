import axios, { AxiosRequestConfig } from 'axios';

/**
 * Simple HTTP GET with retries and sane defaults.
 * Centralizes headers, timeout, and retry policy.
 */
export async function httpGet<T>(
  url: string,
  config?: AxiosRequestConfig,
  retries: number = 2,
  backoffMs: number = 300
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axios.get<T>(url, {
        timeout: 12000,
        validateStatus: (status: number) => status >= 200 && status < 300,
        ...config,
        headers: {
          'User-Agent': 'WL-Backend/1.0 (+http://localhost)',
          'Accept': 'application/json, */*; q=0.8',
          ...(config?.headers || {})
        }
      });
      return res.data as T;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = backoffMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  // Should not reach here, but keep TS happy
  throw lastError ?? new Error('Unknown HTTP error');
}



