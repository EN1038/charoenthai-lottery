/**
 * @format
 */

import '@react-native-firebase/app';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundHandler } from './services/fcm';

// Required: register before AppRegistry for FCM background/quit messages
registerBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
