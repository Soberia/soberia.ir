import {memo, useRef, useState, useEffect, useContext, useMemo} from 'react';

import CSS from './ThemeSwitcher.module.css';
import Focus from '../elements/focus/Focus';
import Vector from '../elements/vector/Vector';
import {settingContext} from '../App';

export enum Theme {
  Light = 'light',
  Dark = 'dark'
}

/** Returns client's operation system preferred theme. */
export function systemTheme() {
  return window.matchMedia(`(prefers-color-scheme: ${Theme.Light})`).matches
    ? Theme.Light
    : Theme.Dark;
}

export default memo(function ThemeSwitcher(props: {
  className?: HTMLDivElement['className'];
  hide?: boolean;
}) {
  const [setting, setSetting] = useContext(settingContext)!;
  const self = useRef<SVGSVGElement>(null);
  const isLightTheme = setting.theme === Theme.Light;

  // Component should be rendered out of the viewport for the
  // very first render because due to uncertainty of theme value,
  // the switch might be on wrong state for fraction of a second.
  // After that value of the `props.hide` will be honored.
  const [hide, setHide] = useState(true);
  useEffect(() => {
    setHide(!!props.hide);
  }, [props.hide]);

  useEffect(() => {
    // Changing default background color to match the theme
    const app = document.getElementById('app');
    if (app) {
      const backgroundColor = window
        .getComputedStyle(app)
        .getPropertyValue('--background');
      document.querySelector('body')!.style.backgroundColor = backgroundColor;
      document
        .querySelector('meta[name="theme-color"]')!
        .setAttribute('content', backgroundColor);
    }
  }, [setting.theme]);

  useEffect(() => {
    // Adopting graphic attributes to the current theme
    const method = isLightTheme ? 'remove' : 'add';
    const light = self.current!.children.namedItem('light');
    self.current!.parentElement!.classList[method](CSS.PullUp);
    self.current!.classList[method]('off');
    for (const element of light!.children) {
      element.classList[method]('off');
    }
  }, [isLightTheme, hide]);

  /** Handles the theme switch. */
  function themeHandler() {
    setSetting(state => ({
      ...state,
      theme: isLightTheme ? Theme.Dark : Theme.Light
    }));
  }

  return useMemo(
    () => (
      <Focus>
        <Vector
          ref={self}
          name="lamp"
          title="Theme"
          className={[
            CSS.ThemeSwitcher,
            hide ? CSS.Hide : '',
            props.className || ''
          ].join(' ')}
          onClick={themeHandler}
        />
      </Focus>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLightTheme, hide, props.className]
  );
});
