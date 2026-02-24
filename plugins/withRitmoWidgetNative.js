const {
  withDangerousMod,
  withPlugins,
  withAppBuildGradle,
  withAndroidManifest,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const withRitmoWidgetXcode = require('./withRitmoWidgetXcode');

function withRitmoWidgetIos(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const targetDir = path.join(projectRoot, 'RitmoWidget');
      const sourceDir = path.join(
        config.modRequest.projectRoot,
        'native',
        'ritmo-widget'
      );
      if (!fs.existsSync(sourceDir)) return config;
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      const swiftFiles = ['SnapshotModel.swift', 'SnapshotReader.swift', 'RitmoWidget.swift'];
      for (const f of swiftFiles) {
        const src = path.join(sourceDir, f);
        const dest = path.join(targetDir, f);
        if (fs.existsSync(src)) fs.copyFileSync(src, dest);
      }

      const plistSrc = path.join(sourceDir, 'Info.plist');
      const plistDest = path.join(targetDir, 'Info.plist');
      if (fs.existsSync(plistSrc)) fs.copyFileSync(plistSrc, plistDest);

      const entSrc = path.join(sourceDir, 'RitmoWidget.entitlements');
      const entDest = path.join(targetDir, 'RitmoWidget.entitlements');
      if (fs.existsSync(entSrc)) fs.copyFileSync(entSrc, entDest);

      return config;
    },
  ]);
}

function withRitmoWidgetAndroid(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const pkg = (config.android?.package || 'com.locione.ritmo').replace(/\./g, path.sep);
      const javaDir = path.join(projectRoot, 'app', 'src', 'main', 'java', pkg);
      const resXmlDir = path.join(projectRoot, 'app', 'src', 'main', 'res', 'xml');
      const sourceDir = path.join(config.modRequest.projectRoot, 'native', 'ritmo-widget-android');

      if (!fs.existsSync(sourceDir)) return config;

      if (!fs.existsSync(javaDir)) fs.mkdirSync(javaDir, { recursive: true });
      if (!fs.existsSync(resXmlDir)) fs.mkdirSync(resXmlDir, { recursive: true });

      const kotlinFiles = ['SnapshotData.kt', 'RitmoGlanceWidget.kt'];
      for (const f of kotlinFiles) {
        const src = path.join(sourceDir, f);
        const dest = path.join(javaDir, f);
        if (fs.existsSync(src)) fs.copyFileSync(src, dest);
      }

      const xmlSrc = path.join(sourceDir, 'ritmo_widget_info.xml');
      const xmlDest = path.join(resXmlDir, 'ritmo_widget_info.xml');
      if (fs.existsSync(xmlSrc)) fs.copyFileSync(xmlSrc, xmlDest);

      return config;
    },
  ]);
}

function withRitmoWidgetGradle(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('androidx.glance:glance-appwidget')) {
      contents = contents.replace(
        /(dependencies\s*\{)/,
        `$1
    implementation 'androidx.glance:glance-appwidget:1.0.0'
    implementation 'androidx.glance:glance-material3:1.0.0'`
      );
    }
    config.modResults.contents = contents;
    return config;
  });
}

function withRitmoWidgetManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const pkg = config.android?.package || 'com.locione.ritmo';
    const receiverClass = `${pkg}.RitmoGlanceReceiver`;

    const receiver = {
      $: {
        'android:name': receiverClass,
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
        },
        {
          action: [{ $: { 'android:name': 'com.locione.ritmo.RELOAD_WIDGET' } }],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/ritmo_widget_info',
          },
        },
      ],
    };

    const applications = manifest.manifest?.application;
    if (!Array.isArray(applications) || applications.length === 0) return config;

    const application = applications[0];
    if (!application.receiver) application.receiver = [];
    const exists = application.receiver.some(
      (r) => r.$?.['android:name'] === receiverClass
    );
    if (!exists) application.receiver.push(receiver);

    return config;
  });
}

function withRitmoWidgetNative(config) {
  return withPlugins(config, [
    withRitmoWidgetIos,
    withRitmoWidgetXcode,
    withRitmoWidgetAndroid,
    withRitmoWidgetGradle,
    withRitmoWidgetManifest,
  ]);
}

module.exports = withRitmoWidgetNative;
