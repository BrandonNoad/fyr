import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as TaskManager from 'expo-task-manager';

import { useIsGeofencingEnabled } from '~/components/IsGeofencingEnabledContext';
import { useApiKey } from '~/components/ApiKeyContext';
import { BeaconList } from '~/screens/BeaconList';
import { AuthN } from '~/screens/AuthN';
import { Debug } from '~/screens/Debug';
import { queryClient } from '~/util/query';

import type { StackNavigator } from './types';

const Stack = createStackNavigator<StackNavigator>();

const makeHeaderTitle = (title: string) => () =>
  <Text className="text-base font-semibold text-blue-50">{title}</Text>;

export const Navigation = () => {
  const { apiKey, setApiKey } = useApiKey();
  const { resetIsGeofencingEnabled } = useIsGeofencingEnabled();

  const isAuthenticated = apiKey !== null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#172554',
          },
          headerTintColor: '#eff6ff',
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="BeaconList"
              component={BeaconList}
              options={({ navigation }) => ({
                headerTitle: makeHeaderTitle('My Beacons'),
                headerRight: () => (
                  <View className="flex flex-row gap-3 px-3">
                    <MaterialIcons
                      name="bug-report"
                      size={24}
                      color="white"
                      onPress={() => {
                        navigation.navigate('Debug');
                      }}
                    />
                    <MaterialIcons
                      name="logout"
                      size={24}
                      color="white"
                      onPress={() => {
                        setApiKey(null);
                        resetIsGeofencingEnabled();
                        TaskManager.unregisterAllTasksAsync();
                        queryClient.clear();
                      }}
                    />
                  </View>
                ),
              })}
            />
            <Stack.Screen
              name="Debug"
              component={Debug}
              options={{
                headerTitle: makeHeaderTitle('Debug'),
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="AuthN"
              component={AuthN}
              options={{
                headerTitle: makeHeaderTitle('Sign In'),
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
