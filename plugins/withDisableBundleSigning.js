const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '## [Ritmo] Disable code signing for resource bundles (Xcode 14+)';

const PATCH = `
    # ${MARKER}
    installer.target_installation_results.pod_target_installation_results.each do |_, target_installation_result|
      target_installation_result.resource_bundle_targets.each do |resource_bundle_target|
        resource_bundle_target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
          config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
        end
      end
    end`;

module.exports = function withDisableBundleSigning(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withDisableBundleSigning] Podfile not found at', podfilePath);
        return config;
      }

      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes(MARKER)) {
        return config;
      }

      if (!contents.includes('post_install do |installer|')) {
        console.warn('[withDisableBundleSigning] No post_install block found in Podfile');
        return config;
      }

      console.log('[withDisableBundleSigning] applying Podfile patch...');

      contents = contents.replace(
        /(post_install do \|installer\|)([\s\S]*?)(\n  end)/m,
        (_, open, body, close) => {
          return open + body + PATCH + close;
        }
      );

      fs.writeFileSync(podfilePath, contents);

      return config;
    },
  ]);
};
