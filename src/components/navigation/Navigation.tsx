import React, {
  memo,
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useContext
} from 'react';

import CSS from './Navigation.module.css';
import CSSCommon from '../Common.module.css';
import ThemeSwitcher from '../theme/ThemeSwitcher';
import Link from '../elements/link/Link';
import Vector from '../elements/vector/Vector';
import {historyContext} from '../App';
import {resolveRoute} from '../../utility/history';

let _state: boolean | undefined;
const _setStates: SetState<boolean>[] = [];

/** Shares the same state between different consumers. */
function useNavigationState(hide = false) {
  const [, setState] = useState(() => {
    if (_state === undefined) {
      _state = hide;
    }
    return _state;
  });
  const _setState = useCallback((state: boolean) => {
    _state = state;
    for (const _setState of _setStates) {
      _setState(state);
    }
  }, []);

  useEffect(() => {
    _setStates.push(setState);
    return () => {
      _setStates.splice(_setStates.indexOf(setState), 1);
      if (!_setStates.length) {
        _state = undefined;
      }
    };
  }, []);

  return [_state, _setState] as const;
}

/** Hides the navigation based on window size or scroll direction of the given element. */
export function useNavigationAutoHide(element: React.RefObject<HTMLElement>) {
  const [, setHide] = useNavigationState();
  const mediaQuery = useMemo(() => window.matchMedia('(max-width: 500px)'), []);
  const mediaQueryMatched = useRef(mediaQuery.matches);
  const lastScrollPosition = useRef(0);
  const timerId = useRef<number>();

  useEffect(() => {
    // Attaching the handler for scroll and window size change
    const _element = element.current;
    if (_element) {
      const handler = () => {
        if (mediaQueryMatched.current) {
          const gap = 30; // pixel
          const _element = element.current!;
          if (_element.scrollTop > lastScrollPosition.current) {
            // Scroll direction is downward
            if (_element.scrollTop - gap > lastScrollPosition.current) {
              lastScrollPosition.current = _element.scrollTop;
              setHide(true);
            }
          } else if (_element.scrollTop < lastScrollPosition.current - gap) {
            // Scroll direction is upward
            lastScrollPosition.current =
              _element.scrollTop <= 0 ? 0 : _element.scrollTop;
            // Temporarily showing the navigation
            window.clearTimeout(timerId.current);
            if (_element.scrollTop > gap) {
              timerId.current = window.setTimeout(
                () => element.current && setHide(true),
                3e3
              );
            }
            setHide(false);
          }
        } else {
          setHide(false);
        }
      };

      mediaQuery.onchange = event => {
        mediaQueryMatched.current = event.matches;
        handler();
      };
      _element.addEventListener('scroll', handler);
      handler();

      return () => {
        mediaQuery.onchange = null;
        _element.removeEventListener('scroll', handler);
        setHide(false);
      };
    }
  }, [element.current]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default memo(function Navigation(props: {hide?: boolean}) {
  const [hide, setHide] = useNavigationState(props.hide);
  const [history, setHistory] = useContext(historyContext)!;
  const self = useRef<HTMLElement>(null);
  const navigationClasses = [CSS.Navigation];
  const itemsClasses = [CSS.Items];
  if (hide) {
    navigationClasses.push(CSS.Inactive);
    itemsClasses.push(CSS.ItemsHide);
  }

  useEffect(() => {
    setHide(!!props.hide);
  }, [props.hide, setHide]);

  useEffect(() => {
    // Preventing focusing on the navigation when it's hidden
    if (hide) {
      self.current!.setAttribute('inert', 'true');
    } else {
      self.current!.removeAttribute('inert');
    }
  }, [hide]);

  let order = 4;
  let space = -8;
  const navigationRoutes = [];
  const topRoute = `/${history.path.split('/')[1]}`;
  const map = {
    blog: 'blog',
    game: 'game',
    home: '',
    info: 'about'
  } as const;
  for (const [key, value] of Object.entries(map) as ObjectEntries<typeof map>) {
    const route = resolveRoute(('base' + (value && `.${value}`)) as any);
    const title = key === 'home' ? key : value;
    const classes = [CSSCommon.Button, CSS.Item];
    let styles: React.CSSProperties | undefined;
    if (topRoute === route)
      classes.push(CSSCommon.ButtonSelected, CSS.ItemSelected);
    else {
      styles = {'--order': order--, '--space': space} as React.CSSProperties;
      space += 4;
    }

    navigationRoutes.push(
      <Link
        key={value}
        href={route}
        style={styles}
        className={classes.join(' ')}
        onClick={() =>
          setHistory(state => (state.path !== route ? {path: route} : state))
        }>
        <Vector name={key} className={CSS.Icon} />
        {title.charAt(0).toUpperCase() + title.slice(1)}
      </Link>
    );
  }

  return (
    <nav ref={self} className={navigationClasses.join(' ')}>
      <ThemeSwitcher hide={hide} />
      <div className={itemsClasses.join(' ')}>{navigationRoutes}</div>
    </nav>
  );
});
