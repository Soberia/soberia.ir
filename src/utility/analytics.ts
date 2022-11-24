declare global {
  interface Window {
    dataLayer: any[];
  }
}

enum EventActions {
  adBlock = 'ad_block',
  pwaInstall = 'pwa_install',
  offlineServer = 'offline_server',
  failedRequest = 'failed_request'
}

window.dataLayer = window.dataLayer || [];

/**
 * Sends reports to Google Analytics service.
 * This is a singleton class.
 */
export default class Analytics {
  static #instance: Analytics;
  static readonly actions = EventActions;
  initialized = false;

  constructor() {
    if (Analytics.#instance) {
      return Analytics.#instance;
    }
    Analytics.#instance = this;
  }

  /** Pushes the given commands to the listener. */
  gtag(...args: any[]) {
    if (this.initialized) {
      window.dataLayer.push(arguments);
    }
  }

  /** Initializes the global tag. */
  initialize(consent: boolean) {
    if (process.env.NODE_ENV === 'production') {
      this.initialized = true;
      this.gtag('js', new Date());
      this.gtag('config', process.env.REACT_APP_GOOGLE_ANALYTICS_ID, {
        app_version: process.env.REACT_APP_VERSION,
        send_page_view: false
      });
      this.manageConsent(consent, true);
    }
  }

  /** Manages consent settings. */
  manageConsent(permission: boolean, isDefault = false) {
    this.gtag('consent', isDefault ? 'default' : 'update', {
      analytics_storage: permission ? 'granted' : 'denied'
    });
  }

  /**
   * Sends `page_view` default event.
   * @param location - Should be the full URL. (e.g. `document.location.href`)
   */
  pageViewEvent(title?: string, location?: string) {
    const parameters: {[key: string]: string} = {};
    if (title) parameters.page_title = title;
    if (location) parameters.page_location = location;
    if (Object.keys(parameters).length) this.gtag('set', parameters);
    this.gtag('event', 'page_view');
  }

  /** Sends `search` default event. */
  searchEvent(query: string) {
    this.gtag('event', 'search', {search_term: query});
  }

  /** Sends `share` default event. */
  shareEvent(title?: string, category?: string, id?: string) {
    this.gtag('event', 'share', {
      method: title,
      content_type: category,
      item_id: id
    });
  }

  /** Sends `exception` default event. */
  exceptionEvent(description?: string, fatal?: boolean) {
    this.gtag('event', 'exception', {
      description,
      fatal,
      nonInteraction: true
    });
  }

  /**
   * Sends a custom event.
   * @param action - The report title of the event.
   * @param value - The value of the event, should be a non-negative integer.
   */
  customEvent(
    action?: EventActions,
    category?: string,
    label?: string,
    value?: number
  ) {
    const parameters: {[key: string]: string | number | boolean} = {
      nonInteraction: true
    };
    if (category) parameters.event_category = category;
    if (label) parameters.event_label = label;
    if (value !== undefined && Number.isInteger(value) && value >= 0)
      parameters.value = value;
    this.gtag('event', action, parameters);
  }
}
