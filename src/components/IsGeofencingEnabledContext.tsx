import React, { useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PropsWithChildren } from 'react';

const IsGeofencingEnabledContext = React.createContext<
  | {
      isGeofencingEnabled: boolean;
      toggleIsGeofencingEnabled: () => Promise<boolean>;
      resetIsGeofencingEnabled: () => Promise<boolean>;
    }
  | undefined
>(undefined);

type Props = PropsWithChildren<{}>;

const KEY = 'isGeofencingEnabled';

const fetchIsGeofencingEnabled = async () => {
  const value = await AsyncStorage.getItem(KEY);

  return !!parseInt(value ?? '0', 10);
};

const IsGeofencingEnabledProvider = ({ children }: Props) => {
  const [isGeofencingEnabled, setIsGeofencingEnabled] =
    useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const result = await fetchIsGeofencingEnabled();
      setIsGeofencingEnabled(result);
    })();
  }, []);

  const setIsGeofencingEnabledInStorage = async (value: boolean | null) => {
    if (value === null) {
      await AsyncStorage.removeItem(KEY);
      setIsGeofencingEnabled(false);
      return true;
    }

    await AsyncStorage.setItem(KEY, value ? '1' : '0');
    setIsGeofencingEnabled(value);
    return true;
  };

  const toggleIsGeofencingEnabled = () =>
    setIsGeofencingEnabledInStorage(!isGeofencingEnabled);

  const resetIsGeofencingEnabled = () => setIsGeofencingEnabledInStorage(false);

  const value = {
    isGeofencingEnabled,
    toggleIsGeofencingEnabled,
    resetIsGeofencingEnabled,
  };

  return (
    <IsGeofencingEnabledContext.Provider value={value}>
      {children}
    </IsGeofencingEnabledContext.Provider>
  );
};

const useIsGeofencingEnabled = () => {
  const context = useContext(IsGeofencingEnabledContext);

  if (context === undefined) {
    throw new Error(
      'useIsGeofencingEnabled must be used within an IsGeofencingEnabledProvider'
    );
  }

  return context;
};

export {
  IsGeofencingEnabledProvider,
  useIsGeofencingEnabled,
  fetchIsGeofencingEnabled,
};
