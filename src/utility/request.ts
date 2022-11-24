import {useRef, useState, useEffect} from 'react';

type Json = string | number | boolean | null | Json[] | {[key: string]: Json};
interface ResponseType {
  arrayBuffer: ArrayBuffer;
  blob: Blob;
  text: string;
  json: Json;
}

export enum FetchFileState {
  Loading,
  Succeed,
  Failed
}

/**
 * @todo Use top-level await when `Webpack` supports it.
 * @example
 * ```typescript
 * const fetchCache = await (async () => {
 *  const CACHE_NAME = `${process.env.REACT_APP_NAME}-temporal-fetch`;
 *  await caches.delete(CACHE_NAME);
 *  return await caches.open(CACHE_NAME);
 * })();
 * ```
 */
let fetchCache: Cache;
const CACHE_NAME = `${process.env.REACT_APP_NAME}-temporal-fetch`;

/** Custom error class for storing HTTP error during the Fetch API calls. */
class HttpError extends Error {
  /**
   * @param code - HTTP error code
   * @param fatal - Request failed due to timeout, no internet connection
   * or server downtime.
   */
  constructor(public code?: number, public fatal?: boolean) {
    super();
  }
}

/**
 * Sends fetch requests while handling errors.
 *
 * @param type
 * The method to use for getting representation of the response body.
 * @param timeout - In milliseconds
 * @param tempCache
 * Whether to temporarily cache the response for the current client's session.
 * @param requestArgs - The additional arguments for the `Request` object.
 *
 * @throws {@link HttpError}
 * When response's status code is not in the range 200–299.
 */
async function customFetch<T extends keyof ResponseType>(
  url: URL | string,
  type: T,
  timeout = 1e4,
  tempCache = false,
  requestArgs?: RequestInit
): Promise<ResponseType[T]> {
  let errorCode: number | undefined;
  const controller = new AbortController();
  const timerId =
    timeout !== Infinity
      ? window.setTimeout(() => controller.abort(), timeout)
      : undefined;
  const request = new Request(url, {
    signal: controller.signal,
    ...requestArgs
  });

  let cachedResponse: Response | undefined;
  if (tempCache) {
    if (!fetchCache) {
      await caches.delete(CACHE_NAME);
      fetchCache = await caches.open(CACHE_NAME);
    }
    cachedResponse = await fetchCache.match(request);
  }

  try {
    const response = cachedResponse || (await window.fetch(request));
    window.clearTimeout(timerId);
    if (response.ok) {
      if (tempCache && !cachedResponse) {
        await fetchCache.put(request, response.clone());
      }
      return await response[type]();
    }
    errorCode = response.status;
  } catch {}

  throw new HttpError(errorCode, !errorCode);
}

/**
 * Gets static files from the web server.
 *
 * @param type
 * The method to use for getting representation of the response body.
 * @param timeout - In milliseconds
 * @param httpCache - Whether to use the browser's HTTP cache.
 * @param tempCache
 * Whether to temporarily cache the response for the current client's session.
 * @typeParam R - The custom type of the response.
 */
export function useFetchFile<
  R,
  T extends keyof ResponseType = keyof ResponseType,
  D = ResponseType[T] extends R ? ResponseType[T] : R
>(
  url: URL | string,
  type: T,
  timeout?: number,
  httpCache = false,
  tempCache = true,
  modifier?: (data: D) => D
) {
  const [state, setState] = useState<FetchFileState>();
  const data = useRef<D>();

  useEffect(() => {
    // Getting the data from the web server
    if (state === undefined)
      (async () => {
        setState(FetchFileState.Loading);
        try {
          data.current = (await customFetch(url, type, timeout, tempCache, {
            cache: httpCache ? 'default' : 'no-store'
          })) as D;
          if (modifier) {
            data.current = modifier(data.current);
          }
          setState(FetchFileState.Succeed);
        } catch {
          setState(FetchFileState.Failed);
        }
      })();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    /** The received data. */
    data: data.current,
    /** The State of the request. */
    state,
    /** Reloads the request. */
    reload: () => setState(undefined)
  };
}
