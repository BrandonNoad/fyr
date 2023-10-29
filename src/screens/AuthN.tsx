import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput, KeyboardAvoidingView } from 'react-native';

import { useApiKey } from '~/components/ApiKeyContext';

export const AuthN = () => {
  const { setApiKey } = useApiKey();
  const [newApiKey, onChangeText] = useState('');

  return (
    <KeyboardAvoidingView className="p-8 flex-1 items-center justify-center bg-slate-200">
      <Text className="text-2xl font-bold mb-4">🔥 Fyr</Text>
      <TextInput
        className="block w-full py-2 px-3 text-base border border-gray-200 rounded-md text-gray-900 bg-white"
        autoComplete="off"
        autoCorrect={false}
        clearButtonMode="while-editing"
        enablesReturnKeyAutomatically={true}
        onChangeText={onChangeText}
        placeholder="Your API key..."
        secureTextEntry={true}
        value={newApiKey}
        onSubmitEditing={async () => {
          const result = await setApiKey(newApiKey);

          if (!result) {
            onChangeText('');
            return;
          }
        }}
      ></TextInput>
      <StatusBar style="light" />
    </KeyboardAvoidingView>
  );
};
