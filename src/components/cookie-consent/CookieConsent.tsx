import {memo, useRef, useEffect, useContext} from 'react';

import CSS from './CookieConsent.module.css';
import CSSCommon from '../Common.module.css';
import Focus from '../elements/focus/Focus';
import Analytics from '../../utility/analytics';
import {settingContext} from '../App';

export default memo(
  function CookieConsent() {
    const [{cookieConsent: consent}, setSetting] = useContext(settingContext)!;
    const self = useRef<HTMLDivElement>(null);

    useEffect(() => {
      // Initializing the Google Analytics global tag
      const analytics = new Analytics();
      if (!analytics.initialized) {
        analytics.initialize(consent.googleAnalytics);
        // Sending event for unhandled exceptions
        const errorMessage = (message: string, error: any) =>
          `[Message]: ${message}` +
          '\n' +
          `[Error]: ${JSON.stringify(
            error,
            Object.getOwnPropertyNames(error)
          )}`;
        window.onunhandledrejection = event =>
          analytics.exceptionEvent(
            errorMessage('Uncaught (in promise)', event.reason),
            false
          );
        window.onerror = (event, source, line, column, error) => {
          analytics.exceptionEvent(
            errorMessage(typeof event === 'string' ? event : event.type, error),
            true
          );
          return false;
        };
      }
      analytics.manageConsent(consent.googleAnalytics);
    }, [consent]);

    /** Handles cookie consent. */
    function consentHandler() {
      self.current!.classList.add(CSS.Hide);
      window.setTimeout(() => {
        // Waiting for the animation
        if (self.current)
          setSetting(state => ({
            ...state,
            cookieConsent: {showWarning: false, googleAnalytics: true}
          }));
      }, 1e3);
    }

    return consent.showWarning ? (
      <div ref={self} className={CSS.CookieConsent}>
        🍪 This website uses cookies for statistical purposes and can be
        disabled in about section anytime.
        <Focus>
          <strong
            className={[CSSCommon.Button, CSS.Button].join(' ')}
            onClick={consentHandler}>
            OK
          </strong>
        </Focus>
      </div>
    ) : null;
  },
  () => true
);
