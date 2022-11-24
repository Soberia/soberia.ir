import {useRef, useState, useCallback, useLayoutEffect, useEffect} from 'react';

import Analytics from '../utility/analytics';
import {useComponentWillMount} from './tools';

type Routes = Partial<
  Record<Exclude<RecursiveKeyof<typeof ROUTES>, 'root'>, string>
>;
export interface History {
  path: string;
  hash?: string;
  /**
   * Custom callback triggers whenever navigation history changes
   * by browser navigation buttons. This callback can be used when
   * a component needs some time to does something before gets
   * unmounted (e.g. play animations).
   */
  navigationHandler?: () => void;
}

/**
 * The routes schema.
 *
 * Routes can be nested by providing an object containing a `root` key.
 * Routes can be dynamic by defining them as a regular expression pattern.
 * To be compatible with **Github Pages**, the `base` route must end with
 * trailing slash. @see https://github.com/slorber/trailing-slash-guide
 *
 * @example
 * ```typescript
 * {
 *  base: {
 *   root: '/',
 *   contact: 'info',
 *   gallery: {
 *    root: 'gallery',
 *    photo: 'image.*.jpg'
 *   }
 *  }
 * }
 * ```
 */
const ROUTES = {
  base: {
    root: '/',
    game: 'game/',
    about: 'about',
    blog: {
      root: 'blog',
      category: {
        root: '(post|memo)',
        id: {
          root: '\\d+',
          title: '.*'
        }
      }
    }
  }
};

const INITIAL_HASH = window.location.hash;
/**
 * Scrolls to the corresponding element for the given hashtag.
 *
 * @param hash - Element's ID. If not provided, hashtag part of the
 * current page URL or from URL on page load will be considered instead.
 * @param rewriteUrl - Whether to rewrite the hashtag on the URL.
 */
export function scrollIntoHash(hash?: string, rewriteUrl = true) {
  hash = hash || window.location.hash || INITIAL_HASH;
  if (hash) {
    const element = document.getElementById(hash.slice(1));
    if (element) {
      if (rewriteUrl) {
        window.history.replaceState(window.history.state, '', hash);
      }
      element.scrollIntoView({behavior: 'smooth'});
    }
  }
}

/**
 * Resolves the given route to corresponding path based on the routes schema.
 * @param replacements - The custom route sections to replace the
 * dynamic routes (regular expression pattern) when building the path.
 */
export function resolveRoute(
  route: JoinedKeyof<RecursiveOmit<typeof ROUTES, 'root'>>,
  replacements?: Routes
) {
  const path: string[] = [];

  let currentRoute: any = ROUTES;
  for (const subRoute of route.split('.')) {
    currentRoute = currentRoute[subRoute];
    if (replacements) {
      const route = replacements[subRoute as keyof Routes];
      if (route) {
        path.push(route);
        continue;
      }
    }
    path.push(
      typeof currentRoute === 'string' ? currentRoute : currentRoute.root
    );
  }

  const lastRoute = path[path.length - 1];
  return lastRoute.startsWith('#')
    ? lastRoute
    : path.join('/').replaceAll('//', '/');
}

/**
 * Resolves and validates the given path and hashtag to the
 * corresponding route sections based on the routes schema.
 * @returns An object containing the validated hashtag, path and its route sections.
 */
export function resolvePath(path: History['path'], hash?: History['hash']) {
  const matchedRoutes: Routes = {};
  const matchedPath: string[] = [];
  const splittedPath = ['/', ...path.split('/').filter(path => path)];
  if (resolveRoute('base') !== '/')
    splittedPath[0] = splittedPath.shift() + splittedPath[0];

  let currentRoute = ROUTES;
  for (const path of splittedPath) {
    let matched = false;
    for (const [key, route] of Object.entries(currentRoute))
      if (key !== 'root') {
        const hasSubRoute = typeof route !== 'string';
        const _route = hasSubRoute ? route.root : route;
        const _path = hasTrailingSlash(_route) ? `${path}/` : path; // Ignoring trailing slashes
        if (new RegExp(`^${_route}$`, 'i').test(_path)) {
          matchedRoutes[key as keyof Routes] = _path;
          matchedPath.push(_path);
          if (hasSubRoute) {
            matched = true;
            (currentRoute as any) = route;
          }
          break;
        }
      }

    if (!matched) {
      break;
    }
  }

  let matchedHash: string | undefined;
  const validatedPath = matchedPath.join('/').replaceAll('//', '/');
  const givenPath = splittedPath.join('/').replaceAll('//', '/');
  if (
    hash &&
    typeof currentRoute !== 'string' &&
    validatedPath ===
      (hasTrailingSlash(validatedPath) ? `${givenPath}/` : givenPath) // Ignoring trailing slashes
  )
    for (const route of Object.values(currentRoute))
      if (typeof route === 'string' && route === hash) {
        matchedHash = hash;
        break;
      }

  return {
    path: validatedPath,
    hash: matchedHash,
    routes: matchedRoutes
  };
}

/** Checks whether the given path has a trailing slash. */
function hasTrailingSlash(path: string) {
  return path.endsWith('/') && path !== '/';
}

/**
 * Removes the hashtag from the URL and forcing to go backward.
 *
 * Hashtag should be removed immediately (by `replaceState()`)
 * to reduce visual glitches in the browser navigation bar.
 * However it's not possible to know whether forward button
 * pressed after this modification because there's no hashtag
 * in URL anymore. Passing a custom object as `data` parameter
 * for determining repetitive forward button press.
 */
function handleHash() {
  window.history.replaceState({goBack: true}, '', window.location.pathname);
  window.history.back();
}

/**
 * Returns initial history after validating the URL.
 *
 * Invalid URLs will be redirected to the base route.
 * Hashtags will be ignored and cleared from the URL.
 *
 * @param baseRoute - If provided, considered as base route.
 */
function initialHistory(baseRoute?: string): History {
  if (baseRoute && baseRoute !== resolveRoute('base'))
    if (typeof ROUTES.base === 'string') {
      (ROUTES.base as string) = baseRoute;
    } else {
      ROUTES.base.root = baseRoute;
    }

  const hash = window.location.hash;
  const path = window.location.pathname;
  let {path: validatedPath, hash: validatedHash} = resolvePath(path, hash);
  validatedPath = validatedPath || resolveRoute('base'); // Redirecting to the base route
  if (validatedPath !== path || hash)
    window.history.replaceState({}, '', validatedPath);

  if (hash && validatedHash)
    for (const entry of window.performance.getEntriesByType('navigation'))
      if (
        entry.entryType === 'navigation' &&
        (entry as PerformanceNavigationTiming).type === 'reload'
      ) {
        // Client refreshed the page and there is a
        // hashtag in URL which is in the routes schema
        handleHash();
        break;
      }

  return {path: validatedPath};
}

/**
 * Manages the browser session history.
 * @param baseRoute - If provided, considered as the base route.
 */
export function useHistory(baseRoute?: string) {
  const [history, _setHistory] = useState(() => initialHistory(baseRoute));
  const previousHandler = useRef(window.onpopstate);

  /**
   * Handles history changes.
   *
   * This is a wrapper around `React.useState()`'s `dispatch` function
   * which runs arbitrary code before updating the state.
   *
   * This ensures `window.location` is updated before updating
   * the state. This is necessary because if navigation history
   * changes inside of `React.useEffect()`, then children components
   * of the parent component which uses this hook have to deal with
   * `window.location` with stale information if trying to access
   * it during the render process.
   */
  const setHistory = useCallback<SetState<History>>(parameter => {
    let updated = false;
    _setHistory(state => {
      const history =
        typeof parameter === 'function' ? parameter(state) : parameter;

      if (Object.is(state, history)) {
        return state; // Bailing out
      }

      // State updater functions run twice in development environment
      // due to `React.StrictMode`, preventing the consequences.
      if (!updated) {
        updated = true;
        const _hash = history.hash || '';
        const hash = window.location.hash;
        const path = window.location.pathname;
        if (history.path !== path || _hash)
          window.history.pushState({}, '', history.path + _hash);
        else if (
          window.history.state?.goBack ||
          (hash && resolvePath(path, hash).hash) // The hashtag is in the routes schema
        )
          // History state is updated by same `path` and no `hash` property
          // and there is a hashtag in URL or client navigated by
          // pressing forward button and there is a hashtag in URL.
          handleHash();
      }

      return history;
    });
  }, []);

  useComponentWillMount(() => {
    /**
     * Attaching the history handler.
     *
     * This cannot be placed inside of `React.useEffect()` hook,
     * because if children components want to attach a different handler
     * then they can't store this handler somewhere (it's not defined yet)
     * and change it to another one and finally restore it on unmount.
     */
    window.onpopstate = event => {
      const path = window.location.pathname;
      if (!path.startsWith(resolveRoute('base'))) {
        /**
         * Client navigated outside of reach,
         * reattaching and executing the previous handler.
         *
         * @bug In development environment due to how `React.StrictMode` works,
         * {@link useHistory} custom hook runs twice and previous handler will
         * be same as the current handler therefore navigation will be broken.
         */
        window.onpopstate = previousHandler.current;
        previousHandler.current && previousHandler.current.call(window, event);
        return;
      }

      setHistory(state => {
        if (state.navigationHandler) {
          state.navigationHandler();
          return state;
        }
        return {path};
      });
    };
  });

  useLayoutEffect(() => {
    /**
     * Reattaching the previous handler.
     *
     * @bug In development environment due to how `React.StrictMode` works,
     * {@link useHistory} custom hook runs twice and previous handler will
     * be same as current handler. Preventing this at the cost of broken
     * navigation in parent component.
     */
    const handler = previousHandler.current; // Satisfying ESLint
    return () => {
      if (process.env.NODE_ENV === 'production') {
        window.onpopstate = handler;
      }
    };
  }, []);

  useEffect(() => {
    // Sending `page_view` event
    new Analytics().pageViewEvent(
      window.document.title,
      `${process.env.REACT_APP_ORIGIN}${history.path}`
    );
  }, [history]);

  return [history, setHistory] as const;
}
