import { useEffect, useState } from 'react';
import {
  Platform,
  Linking,
  View,
  FlatList,
  RefreshControl,
  Text,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as BackgroundFetch from 'expo-background-fetch';
import { useQuery } from '@tanstack/react-query';

import { useRefreshByUser } from '~/hooks/useRefreshByUser';
import { useRefreshOnFocus } from '~/hooks/useRefreshOnFocus';
import { useApiKey } from '~/components/ApiKeyContext';
import { useIsGeofencingEnabled } from '~/components/IsGeofencingEnabledContext';
import {
  N10N_CHANNEL_ID_NEARBY_BEACON_ALERTS,
  BACKGROUND_FETCH_TASK_NAME,
  BACKGROUND_FETCH_INTERVAL_MINUTES,
} from '~/constants';
import { toTanaUrl } from '~/util';
import {
  startGeofencing,
  stopGeofencing,
  fetchBeacons,
} from '~/util/geofencing';

import type { StackNavigationProp } from '@react-navigation/stack';
import type { StackNavigator } from '~/navigation/types';
import type { Beacon } from '~/util/geofencing';

const useLocationPermissions = () => {
  const [status, setStatus] = useState<'undetermined' | 'granted' | 'denied'>(
    'undetermined'
  );

  useEffect(() => {
    (async () => {
      // Note: Foreground permissions should be granted before asking for the background permissions
      // (your app can't obtain background permission without foreground permission).
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        setStatus('denied');
        return;
      }

      // TODO: Expo Go on iOS, this causes Error: One of the `NSLocation*UsageDescription` keys
      // TODO: how to explain? Asks the user to grant permissions for location while the app is in
      // the background.
      //
      // On Android 11 or higher: this method will open the system settings page. Before that
      // happens, you should explain to the user why your application needs background location
      // permission. For example, you can use Modal component from react-native to do that.
      //
      // iOS - Must be present in Info.plist to be able to use geolocation.
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();

      setStatus(backgroundStatus);
    })();
  }, []);

  return status;
};

const useNotificationsPermissions = () => {
  const [status, setStatus] = useState<'undetermined' | 'granted' | 'denied'>(
    'undetermined'
  );

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        // By default, all notifications posted to a given channel use the visual and auditory
        // behaviors defined by the importance level
        const res = await Notifications.setNotificationChannelAsync(
          N10N_CHANNEL_ID_NEARBY_BEACON_ALERTS,
          {
            name: 'Nearby Beacon Alerts',
            importance: Notifications.AndroidImportance.MAX,
            enableVibrate: true,
          }
        );
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setStatus(finalStatus);
    })();
  }, []);

  if (!Device.isDevice) {
    console.warn('Must use a physical device for Push Notifications!');
    return 'denied';
  }

  return status;
};

const stopBackgroundFetch = async () => {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_FETCH_TASK_NAME
  );

  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK_NAME);
  }
};

type Props = {
  navigation: StackNavigationProp<StackNavigator, 'BeaconList'>;
};

export const BeaconList = ({ navigation }: Props) => {
  const { apiKey } = useApiKey();
  const locationPermissionsStatus = useLocationPermissions();
  const notificationsPermissionsStatus = useNotificationsPermissions();

  const { isGeofencingEnabled, toggleIsGeofencingEnabled } =
    useIsGeofencingEnabled();

  const { isLoading, isError, error, data, refetch } = useQuery<
    Beacon[],
    Error
  >({
    queryKey: ['beacons'],
    queryFn: (): Promise<Beacon[]> =>
      fetchBeacons({
        apiKey: apiKey ?? '',
        prevData: data ?? [],
        isGeofencingEnabled,
      }),
    enabled: apiKey !== null && locationPermissionsStatus === 'granted',
  });
  const { isRefetchingByUser, refetchByUser } = useRefreshByUser(refetch);
  useRefreshOnFocus(refetch);

  useEffect(() => {
    if (isGeofencingEnabled) {
      if (data !== undefined) {
        startGeofencing(data);
      }

      BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK_NAME, {
        minimumInterval: 60 * BACKGROUND_FETCH_INTERVAL_MINUTES,
        // Android only
        stopOnTerminate: false,
        // Android only
        startOnBoot: true,
      });
    } else {
      stopGeofencing();
      stopBackgroundFetch();
    }
  }, [isGeofencingEnabled]);

  if (
    locationPermissionsStatus === 'undetermined' ||
    notificationsPermissionsStatus === 'undetermined' ||
    isLoading
  ) {
    return (
      <View className="h-full flex-1 justify-center bg-slate-200">
        <ActivityIndicator size="large" className="text-orange-600" />
      </View>
    );
  }

  if (
    locationPermissionsStatus === 'denied' ||
    notificationsPermissionsStatus === 'denied'
  ) {
    // TODO: improve this scenario
    return <Text>USER DENIED PERMS!</Text>;
  }

  if (isError) {
    // TODO: improve this scenario
    return (
      <>
        <Text>ERROR! {error.message}</Text>
      </>
    );
  }

  return (
    <View className="px-4 py-6 h-full flex-1 bg-slate-200">
      <FlatList
        className=""
        data={data}
        renderItem={({ item }) => (
          <View className="mb-3">
            <Text className="text-base font-medium" selectable={true}>
              {item.query}
            </Text>
            <Text className="text-base" selectable={true}>
              Node:{' '}
              <Text
                className="text-blue-700"
                onPress={() => {
                  Linking.openURL(toTanaUrl(item.nodeId));
                }}
                selectable={true}
              >
                {item.nodeId}
              </Text>
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingByUser}
            onRefresh={refetchByUser}
          />
        }
      />
      <View className="flex flex-row justify-center gap-3 items-center ">
        <Text
          className="text-base font-medium text-gray-900"
          onPress={async () => {
            await toggleIsGeofencingEnabled();
          }}
        >
          Geofencing Enabled?
        </Text>
        <Switch
          thumbColor={isGeofencingEnabled ? `#ea580c` : `white`}
          trackColor={{ false: '#94a3b8', true: '#fdba74' }}
          onValueChange={async () => {
            await toggleIsGeofencingEnabled();
          }}
          value={isGeofencingEnabled}
        />
      </View>
      <StatusBar style="light" />
    </View>
  );
};
