import './global.css';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function App(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-white text-2xl font-bold">Trainer</Text>
      <Text className="text-white/60 mt-2 text-sm">
        Your intelligent fitness companion
      </Text>
      <StatusBar style="light" />
    </View>
  );
}
