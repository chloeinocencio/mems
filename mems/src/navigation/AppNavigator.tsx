import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createStackNavigator,
  type StackNavigationOptions,
} from '@react-navigation/stack';

import type { RootStackParamList } from '../types';
import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import PhotoPickerScreen from '../screens/PhotoPickerScreen';
import GalleryScreen from '../screens/GalleryScreen';
import VideoExportScreen from '../screens/VideoExportScreen';

const Stack = createStackNavigator<RootStackParamList>();

const defaultScreenOptions: StackNavigationOptions = {
  headerStyle: { backgroundColor: '#FAFAFA', elevation: 0, shadowOpacity: 0 },
  headerTintColor: '#1A202C',
  headerTitleStyle: { fontWeight: '700', fontSize: 18 },
  headerBackTitleVisible: false,
  cardStyle: { backgroundColor: '#FAFAFA' },
};

export default function AppNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={defaultScreenOptions}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Mems' }}
        />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ headerShown: false }} // full-screen camera UI
        />
        <Stack.Screen
          name="PhotoPicker"
          component={PhotoPickerScreen}
          options={{ title: 'Select Photo' }}
        />
        <Stack.Screen
          name="Gallery"
          component={GalleryScreen}
          options={{ title: 'Monthly Gallery' }}
        />
        <Stack.Screen
          name="VideoExport"
          component={VideoExportScreen}
          options={{ title: 'Export Video' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
