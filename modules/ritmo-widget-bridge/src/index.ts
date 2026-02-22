import { requireNativeModule } from 'expo-modules-core';

const RitmoWidgetBridge = requireNativeModule('RitmoWidgetBridge');

export function getAppGroupPath(): Promise<string> {
  const path = RitmoWidgetBridge.getAppGroupPath();
  return Promise.resolve(path ?? '');
}

export function reloadWidgets(): void {
  RitmoWidgetBridge.reloadWidgets();
}

export function writeSnapshotAndReload(json: string): Promise<void> {
  return RitmoWidgetBridge.writeSnapshotAndReload(json);
}
