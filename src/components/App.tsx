import MatchMoji from '@soberia/matchmoji/lazy';
import {createContext, useMemo, useRef, useEffect} from 'react';

import CSS from './App.module.css';
import CSSTheme from './theme/Theme.module.css';
import Blog from './blog/Blog';
import Homepage from './homepage/Homepage';
import Navigation from './navigation/Navigation';
import CookieConsent from './cookie-consent/CookieConsent';
import {Theme} from './theme/ThemeSwitcher';
import {useLocalSetting} from '../utility/storage';
import {useHistory, resolveRoute} from '../utility/history';

export const settingContext = createContext<ReturnType<
  typeof useLocalSetting
> | null>(null);
export const historyContext = createContext<ReturnType<
  typeof useHistory
> | null>(null);

export default function App() {
  const [setting, setSetting] = useLocalSetting();
  const [history, setHistory] = useHistory();
  const lastRoute = useRef(resolveRoute('base'));
  const gameRoute = useRef(resolveRoute('base.game'));

  useEffect(() => {
    // Storing the last route to go
    // back to it when exiting the game
    if (history.path !== gameRoute.current) {
      lastRoute.current = history.path;
    }
  }, [history]);

  // Handling navigation
  let hideNavigation = false;
  let route = <Homepage />;
  if (history.path.startsWith(resolveRoute('base.blog'))) {
    route = <Blog />;
  } else if (history.path === gameRoute.current) {
    const isLight = setting.theme === Theme.Light;
    hideNavigation = true;
    route = (
      <MatchMoji
        path={gameRoute.current}
        theme={{
          isLight,
          handler: () =>
            setSetting(state => ({
              ...state,
              theme: isLight ? Theme.Dark : Theme.Light
            }))
        }}
        exitHandler={() => setHistory({path: lastRoute.current})}
      />
    );
  }

  return (
    <div id="app" className={[CSS.App, CSSTheme[setting.theme]].join(' ')}>
      <settingContext.Provider
        value={useMemo(
          () => [setting, setSetting] as const,
          [setting, setSetting]
        )}>
        <historyContext.Provider
          value={useMemo(
            () => [history, setHistory] as const,
            [history, setHistory]
          )}>
          <Navigation hide={hideNavigation} />
          <CookieConsent />
          {route}
        </historyContext.Provider>
      </settingContext.Provider>
    </div>
  );
}
