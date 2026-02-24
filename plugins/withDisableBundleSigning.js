const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '## [Ritmo] Disable code signing for resource bundles (Xcode 14+)';

// Dual approach: installer.pods_project.targets (bundle product_type) + target_installation_results
// Covers all CocoaPods versions and resource bundle flavors
const PATCH = `
    # ${MARKER}
    # Approach 1: All bundle targets in Pods project (product_type .bundle)
    installer.pods_project.targets.each do |target|
      if target.respond_to?(:product_type) && target.product_type == "com.apple.product-type.bundle"
        target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
          config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
          config.build_settings['CODE_SIGNING_IDENTITY'] = ''
          config.build_settings['EXPANDED_CODE_SIGN_IDENTITY'] = ''
          config.build_settings['CODE_SIGN_ENTITLEMENTS'] = ''
        end
      end
    end
    # Approach 2: resource_bundle_targets (CocoaPods 1.11+)
    if installer.respond_to?(:target_installation_results) && installer.target_installation_results.respond_to?(:pod_target_installation_results)
      installer.target_installation_results.pod_target_installation_results.each do |_, target_installation_result|
        next unless target_installation_result.respond_to?(:resource_bundle_targets)
        target_installation_result.resource_bundle_targets.each do |resource_bundle_target|
          resource_bundle_target.build_configurations.each do |config|
            config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
            config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
            config.build_settings['CODE_SIGNING_IDENTITY'] = ''
            config.build_settings['EXPANDED_CODE_SIGN_IDENTITY'] = ''
            config.build_settings['CODE_SIGN_ENTITLEMENTS'] = ''
          end
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

      // Insert before the post_install block's closing "end"
      // Matches: post_install do |installer| ... end (handles 2-space or 4-space indent)
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
