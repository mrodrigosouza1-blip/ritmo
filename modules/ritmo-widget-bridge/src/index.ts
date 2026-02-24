import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

const RitmoWidgetBridge = requireNativeModule('RitmoWidgetBridge');

export function getAppGroupPath(): Promise<string> {
  if (Platform.OS !== 'ios') return Promise.resolve('');
  const path = RitmoWidgetBridge.getAppGroupPath();
  return Promise.resolve(path ?? '');
}

export function reloadWidgets(): void {
  if (Platform.OS === 'ios') RitmoWidgetBridge.reloadWidgets();
}

export function writeSnapshotAndReload(json: string): Promise<void> {
  if (Platform.OS !== 'ios') return Promise.resolve();
  return RitmoWidgetBridge.writeSnapshotAndReload(json);
}

export function writeSnapshotAndroid(json: string): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  return RitmoWidgetBridge.writeSnapshotAndroid(json);
}

export function reloadAndroidWidget(): void {
  if (Platform.OS === 'android') RitmoWidgetBridge.reloadAndroidWidget();
}
