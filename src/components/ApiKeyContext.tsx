import React, { useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

import type { PropsWithChildren } from 'react';

const ApiKeyContext = React.createContext<
  | {
      apiKey: string | null | undefined;
      setApiKey: (apiKey: string | null) => Promise<boolean>;
    }
  | undefined
>(undefined);

type Props = PropsWithChildren<{}>;

const KEY = 'apiKey';

const fetchApiKey = () => SecureStore.getItemAsync(KEY);

const ApiKeyProvider = ({ children }: Props) => {
  const [apiKey, setApiKey] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const apiKey = await fetchApiKey();
      setApiKey(apiKey);
    })();
  }, []);

  // Loading...
  if (apiKey === undefined) {
    return null;
  }

  // TODO: Validate `apiKey` if not null. If invalid, return false and don't set it.
  const setApiKeyInSecureStore = async (apiKey: string | null) => {
    if (apiKey === null) {
      await SecureStore.deleteItemAsync(KEY);
      setApiKey(null);
      return true;
    }

    await SecureStore.setItemAsync(KEY, apiKey);
    setApiKey(apiKey);
    return true;
  };

  const value = { apiKey, setApiKey: setApiKeyInSecureStore };

  return (
    <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>
  );
};

const useApiKey = () => {
  const context = useContext(ApiKeyContext);

  if (context === undefined) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }

  return { ...context, apiKey: context.apiKey ?? null };
};

export { ApiKeyProvider, useApiKey, fetchApiKey };
