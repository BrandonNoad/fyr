import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

import { N10N_CHANNEL_ID_NEARBY_BEACON_ALERTS } from '~/constants';

import type { StackNavigationProp } from '@react-navigation/stack';
import type { StackNavigator } from '~/navigation/types';
import type { TaskManagerTask } from 'expo-task-manager';

const useTasks = () => {
  const [tasks, setTasks] = useState<TaskManagerTask[]>([]);

  useEffect(() => {
    (async () => {
      const tasks = await TaskManager.getRegisteredTasksAsync();
      setTasks(tasks);
    })();
  }, []);

  return tasks;
};

type Props = {
  navigation: StackNavigationProp<StackNavigator, 'Debug'>;
};

export const Debug = ({}: Props) => {
  const tasks = useTasks();

  return (
    <View className="px-4 py-6 h-full bg-slate-200">
      <View className="flex flex-row w-100 justify-center">
        <TouchableOpacity
          className="bg-orange-600 py-3 px-4 rounded"
          onPress={async () => {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Test Notification!',
                body: `Testing 123...`,
              },
              trigger: {
                channelId: N10N_CHANNEL_ID_NEARBY_BEACON_ALERTS,
                seconds: 1,
              },
            });
          }}
        >
          <Text className="text-base font-semibold text-white text-center">
            Trigger Test Notification
          </Text>
        </TouchableOpacity>
      </View>
      {tasks.length > 0
        ? tasks.map((task) => (
            <Text key={task.taskName} className="mt-5" selectable={true}>
              {JSON.stringify(task.options, null, 2)}
            </Text>
          ))
        : null}
      <StatusBar style="light" />
    </View>
  );
};
