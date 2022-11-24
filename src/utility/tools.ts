import {useRef} from 'react';

/**
 * Updates page title and description, Open Graph and
 * Twitter Cards meta tags to the given values.
 */
export function metaTagUpdater(
  title: string,
  description = '',
  photoUrl = '',
  pageUrl = ''
) {
  document.title = title;
  for (const [key, value] of Object.entries({
    'meta[name="description"]': description,
    'meta[name="twitter:title"]': title,
    'meta[name="twitter:description"]': description,
    'meta[name="twitter:image"]': photoUrl,
    'meta[property="og:title"]': title,
    'meta[property="og:description"]': description,
    'meta[property="og:image': photoUrl,
    'meta[property="og:url"]': pageUrl
  }))
    document.querySelector(key)!.setAttribute('content', value);
}

/**
 * Temporally adds a class or classes to given element or elements.
 * @param time - In milliseconds
 * @param callback - Runs after removing classes.
 * @returns A callback function to cancel the process.
 */
export function temporalStyle<T extends HTMLElement>(
  element: T | T[],
  className: string | string[],
  time: number,
  callback?: () => void
) {
  const elements: T[] = Array.isArray(element) ? element : [element];
  const classNames: string[] =
    typeof className === 'string' ? [className] : className;

  for (const element of elements) {
    element.classList.add(...classNames);
  }

  let removed = false;
  const timerId = window.setTimeout(() => {
    for (const element of elements) {
      element?.classList.remove(...classNames);
    }
    removed = true;
    callback && callback();
  }, time);

  return () => {
    if (!removed) {
      window.clearTimeout(timerId);
      for (const element of elements) {
        element?.classList.remove(...classNames);
      }
    }
  };
}

/** Checks whether the given URL is relative or absolute. */
export function isRelativeUrl(url: URL | string) {
  return !/^(?:[a-z+]+:)?\/\//i.test(
    typeof url === 'string' ? url : url.toString()
  );
}

/**
 * Gets real-time value of `React.useState` hook.
 * Due to how JavaScript's closures work, state is stale in closures.
 * This function can be useful for getting the current state in closures.
 */
export function realtimeState<T>(setState: SetState<T>): Promise<T> {
  return new Promise<T>(resolve =>
    setState(state => {
      resolve(state);
      return state;
    })
  );
}

/** Mimics React `componentWillMount` lifecycle behavior. */
export function useComponentWillMount(callback: () => void) {
  const mounted = useRef(false);
  if (!mounted.current) {
    mounted.current = true;
    callback();
  }
}
