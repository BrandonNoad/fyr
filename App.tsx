import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
// import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useOnlineManager } from '~/hooks/useOnlineManager';
import { useAppState } from '~/hooks/useAppState';
import { ApiKeyProvider, fetchApiKey } from '~/components/ApiKeyContext';
import {
  IsGeofencingEnabledProvider,
  fetchIsGeofencingEnabled,
} from '~/components/IsGeofencingEnabledContext';
import { Navigation } from '~/navigation/Navigation';
import { toTanaUrl } from '~/util';
import { queryClient } from '~/util/query';
import {
  GEOFENCING_TASK_NAME,
  REGION_IDENTIFIER_PREFIX,
  N10N_CHANNEL_ID_NEARBY_BEACON_ALERTS,
  BACKGROUND_FETCH_TASK_NAME,
} from '~/constants';
import { fetchBeacons } from '~/util/geofencing';

import type { LocationRegion } from 'expo-location';

// TODO: To use BackgroundFetch API in standalone apps on iOS, your app has to include background
// mode in the Info.plist file. See background tasks configuration guide for more details.

// When a notification is received while the app is running, using this function you can set a
// callback that will decide whether the notification should be shown to the user or not.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const regionIdentifierToNodeId = (regionIdentifier: string | undefined) => {
  if (
    typeof regionIdentifier !== 'string' ||
    !regionIdentifier.startsWith(REGION_IDENTIFIER_PREFIX)
  ) {
    return null;
  }

  const slashPosition = regionIdentifier.indexOf('/');

  if (slashPosition < 0) {
    return null;
  }

  return regionIdentifier.slice(REGION_IDENTIFIER_PREFIX.length, slashPosition);
};

// Defines task function. It must be called in the GLOBAL scope of your JavaScript bundle. In
// particular, it cannot be called in any of React lifecycle methods like componentDidMount. This
// limitation is due to the fact that when the application is launched in the background, we need to
// spin up your JavaScript app, run your task and then shut down — no views are mounted in this
// scenario.
TaskManager.defineTask<{
  eventType: Location.GeofencingEventType;
  region: LocationRegion;
}>(GEOFENCING_TASK_NAME, async ({ data: { eventType, region }, error }) => {
  if (error) {
    // TODO: check `error.message` for more details.
    console.error(error);
    return;
  }

  if (eventType === Location.GeofencingEventType.Enter) {
    console.log("You've entered region:", region);

    const nodeId = regionIdentifierToNodeId(region.identifier);

    if (nodeId !== null) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Nearby Beacon!',
          body: `Node ${nodeId}'s beacon is nearby`,
          data: { url: toTanaUrl(nodeId) },
        },
        trigger: {
          channelId: N10N_CHANNEL_ID_NEARBY_BEACON_ALERTS,
          // It seems that 'seconds' is required if you want to specify a 'channelId'.
          seconds: 1,
        },
      });
    }
    return;
  }

  if (eventType === Location.GeofencingEventType.Exit) {
    // TODO: Do we care about exit?
    console.log("You've left region:", region);
  }
});

TaskManager.defineTask(BACKGROUND_FETCH_TASK_NAME, async () => {
  console.log('Starting background fetch task...');

  const [apiKey, isGeofencingEnabled] = await Promise.all([
    fetchApiKey(),
    fetchIsGeofencingEnabled(),
  ]);

  if (apiKey && isGeofencingEnabled) {
    // TODO: May fail if location permissions have not been granted.
    // Starts/stops geofencing based on the number of beacons.
    await fetchBeacons({
      apiKey,
      isGeofencingEnabled,
      prevData: [],
    });
  }

  // Be sure to return the successful result type!
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

export default function App() {
  useOnlineManager();
  useAppState();

  useEffect(() => {
    // Open Tana when the user clicks on the notification.
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { url } = response.notification.request.content.data;
        Linking.openURL(url);
      }
    );

    return () => {
      Notifications.removeNotificationSubscription(subscription);
    };
  }, []);

  // TODO: why wasn't SafeArea working?
  return (
    <QueryClientProvider client={queryClient}>
      <ApiKeyProvider>
        <IsGeofencingEnabledProvider>
          {/* <SafeAreaProvider> */}
          {/* <SafeAreaView> */}
          <Navigation />
          {/* </SafeAreaView> */}
          {/* </SafeAreaProvider> */}
        </IsGeofencingEnabledProvider>
      </ApiKeyProvider>
    </QueryClientProvider>
  );
}
