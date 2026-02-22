const {
  withDangerousMod,
  withEntitlementsPlist,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin que copia os arquivos Swift do RitmoWidget para ios/ após prebuild.
 * O usuário ainda precisa adicionar o target "RitmoWidget" no Xcode manualmente.
 */
function withRitmoWidgetNative(config) {
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

      if (!fs.existsSync(sourceDir)) {
        return config;
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const files = ['SnapshotModel.swift', 'SnapshotReader.swift', 'RitmoWidget.swift'];
      for (const f of files) {
        const src = path.join(sourceDir, f);
        const dest = path.join(targetDir, f);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }

      return config;
    },
  ]);
}

module.exports = withRitmoWidgetNative;
