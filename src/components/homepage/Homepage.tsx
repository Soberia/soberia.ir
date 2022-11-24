import {memo, useRef, useState, useEffect, useContext} from 'react';

import CSS from './Homepage.module.css';
import Profile from './profile.webp';
import CSSCommon from '../Common.module.css';
import Link from '../elements/link/Link';
import Switch from '../elements/switch/Switch';
import Vector from '../elements/vector/Vector';
import {settingContext, historyContext} from '../App';
import {resolveRoute} from '../../utility/history';

const initialTitle = document.title;

const Language = memo(
  function (props: {language: string; rate: number}) {
    const stars = [];
    const starAttributes = {className: 'fill'};
    for (let count = 1; count <= 5; count++)
      stars.push(
        <Vector
          key={count}
          name="star"
          className={CSS.Star}
          svgProps={count <= props.rate ? starAttributes : undefined}
        />
      );

    return (
      <div className={CSS.Language}>
        {props.language} <span>{stars}</span>
      </div>
    );
  },
  () => true
);

export default function Homepage() {
  const [history] = useContext(historyContext)!;
  const [setting, setSetting] = useContext(settingContext)!;

  const isAboutRoute = history.path === resolveRoute('base.about');
  const [showAbout, setShowAbout] = useState(isAboutRoute);
  const about = useRef<HTMLDivElement>(null);
  const timerId = useRef<number>();
  const email = 'SaberHayati@outlook.com';

  useEffect(() => {
    // Resetting the page title
    document.title = initialTitle;
  }, []);

  useEffect(() => {
    window.clearTimeout(timerId.current);
    if (isAboutRoute) {
      timerId.current = window.setTimeout(
        // Showing the scrollbar
        () => about.current?.classList.remove(CSSCommon.ScrollbarHidden),
        700
      );
      setShowAbout(true);
    } else {
      timerId.current = window.setTimeout(() => setShowAbout(false), 300);
    }
  }, [isAboutRoute]);

  const logoClasses = [CSS.Logo];
  const infoClasses = [CSS.Info];
  const aboutClasses = [
    CSS.About,
    CSSCommon.Scrollbar,
    // To avoid temporary scrollbar appearing,
    // initially scrollbar is hidden and will be
    // visible after playing the animation.
    CSSCommon.ScrollbarHidden
  ];
  if (isAboutRoute) {
    logoClasses.push(CSS.LogoPullUp);
  } else {
    infoClasses.push(CSS.InfoHide);
    aboutClasses.push(CSS.AboutHide);
  }

  return (
    <main className={CSS.Homepage}>
      <Vector name="logo" className={logoClasses.join(' ')} />
      {showAbout && (
        <>
          <div ref={about} className={aboutClasses.join(' ')}>
            <img
              className={CSS.Profile}
              width={1}
              height={1}
              src={Profile}
              draggable="false"
              alt="Saber Hayati"
            />
            <p className={CSS.Biography}>
              Hi my name is Saber,
              <br />
              just another average developer and ignorant human being.
            </p>
            <div className={CSS.Title}>Machine</div>
            <Language language="C/C++" rate={1} />
            <Language language="Python" rate={4} />
            <Language language="JavaScript/TypeScript" rate={4} />
            <div className={CSS.Title}>Human</div>
            <Language language="English" rate={3} />
            <Language language="Persian" rate={4} />
          </div>
          <div className={infoClasses.join(' ')}>
            <div>
              🍪 Statistical Cookies
              <Switch
                className={CSS.CookieSwitch}
                on={setting.cookieConsent.googleAnalytics}
                callback={() =>
                  setSetting(state => ({
                    ...state,
                    cookieConsent: {
                      showWarning: false,
                      googleAnalytics: !state.cookieConsent.googleAnalytics
                    }
                  }))
                }
              />
            </div>
            <div>
              📫 <Link href={`mailto:${email}`}>{email}</Link>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
