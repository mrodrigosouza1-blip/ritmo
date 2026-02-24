const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const BUNDLE_SIGNING_PATCH = `
    # Disable code signing for resource bundles (Xcode 14+)
    installer.target_installation_results.pod_target_installation_results.each do |_, target_installation_result|
      target_installation_result.resource_bundle_targets.each do |resource_bundle_target|
        resource_bundle_target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
          config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
          config.build_settings['CODE_SIGNING_IDENTITY'] = ''
        end
      end
    end`;

module.exports = function withDisableBundleSigning(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes('Disable code signing for resource bundles')) {
        contents = contents.replace(
          /(post_install do \|installer\|)([\s\S]*?)(\n  end)/m,
          (_, open, body, close) => {
            return open + body + BUNDLE_SIGNING_PATCH + close;
          }
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};
