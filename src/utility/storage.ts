import {useState, useEffect} from 'react';

import {systemTheme} from '../components/theme/ThemeSwitcher';

export type LocalSetting = ReturnType<typeof defaultLocalSettingGenerator>;

/**
 * Generates the default local settings.
 *
 * `undefined` and `null` should not be used as value
 * due to incompatibility with {@link updateLocalSetting}.
 */
function defaultLocalSettingGenerator() {
  return {
    version: process.env.REACT_APP_VERSION!,
    theme: systemTheme(),
    cookieConsent: {showWarning: true, googleAnalytics: false}
  };
}

/** Merges default local setting with stored previous versions in-place. */
function updateLocalSetting<T extends {[key: string]: any}>(
  current: T,
  previous: T
) {
  const isObject = (object: any) =>
    typeof object === 'object' && object !== null && !Array.isArray(object);

  for (const [key, value] of Object.entries(current) as ObjectEntries<T>)
    if (typeof value === typeof previous[key])
      current[key] =
        isObject(value) && isObject(previous[key])
          ? updateLocalSetting(value, previous[key])
          : previous[key];

  return current;
}

/**
 * Reads and stores application's settings on the `Web Storage API`.
 * @param name - Name of the storage
 * @param encrypt - Encrypt data to `Base64` format.
 */
export function useLocalSetting(name = 'setting', encrypt = false) {
  const [localSetting, setLocalSetting] = useState(() => {
    const setting = localStorage.getItem(name);
    const defaultSetting = defaultLocalSettingGenerator();
    if (setting) {
      const parsedSetting: LocalSetting = JSON.parse(
        encrypt ? window.atob(setting) : setting // decoding
      );
      if (parsedSetting.version !== defaultSetting.version) {
        // Updating stored setting to the new version
        parsedSetting.version = defaultSetting.version;
        updateLocalSetting(defaultSetting, parsedSetting);
        storeSetting(parsedSetting);
      }
      return parsedSetting;
    } else {
      return defaultSetting;
    }
  });

  /** Stores the setting on the storage. */
  function storeSetting(localSetting: Readonly<LocalSetting>) {
    const stringifiedSetting = JSON.stringify(localSetting);
    localStorage.setItem(
      name,
      encrypt ? window.btoa(stringifiedSetting) : stringifiedSetting // encoding
    );
  }

  useEffect(() => {
    // Storing setting changes
    storeSetting(localSetting);
  }, [localSetting]); // eslint-disable-line react-hooks/exhaustive-deps

  return [localSetting, setLocalSetting] as const;
}
