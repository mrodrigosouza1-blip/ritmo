const { withXcodeProject } = require('@expo/config-plugins');
const path = require('path');

const TARGET_NAME = 'RitmoWidget';
const SWIFT_FILES = ['RitmoWidget.swift', 'SnapshotModel.swift', 'SnapshotReader.swift'];

function getAppleTeamId(config) {
  const teamId =
    config.ios?.appleTeamId ||
    process.env.APPLE_TEAM_ID ||
    '';
  const trimmed = String(teamId).trim();
  if (!trimmed) {
    throw new Error(
      '[withRitmoWidgetXcode] Apple Team ID is required for widget signing (Xcode 14+). ' +
        'Set expo.ios.appleTeamId in app.json or APPLE_TEAM_ID environment variable (e.g. in EAS secrets).'
    );
  }
  return trimmed;
}

function addRitmoWidgetTarget(config) {
  const appleTeamId = getAppleTeamId(config);
  const bundleIdentifier = config.ios?.bundleIdentifier
    ? `${config.ios.bundleIdentifier}.${TARGET_NAME}`
    : `com.locione.ritmo.${TARGET_NAME}`;
  const deploymentTarget = '15.1';
  const platformRoot = config.modRequest.platformProjectRoot;
  const widgetDir = path.join(platformRoot, TARGET_NAME);

  const swiftFilePaths = SWIFT_FILES.map((f) => `${TARGET_NAME}/${f}`);
  const allGroupFiles = [
    ...swiftFilePaths,
    `${TARGET_NAME}/Info.plist`,
    `${TARGET_NAME}/${TARGET_NAME}.entitlements`,
  ];
  const xcodeProject = config.modResults;

  // Generate UUIDs
  const targetUuid = xcodeProject.generateUuid();
  const groupName = 'Embed Foundation Extensions';
  const marketingVersion = config.version || '1.0.0';
  const currentProjectVersion = config.ios?.buildNumber || '1';

  // XCConfigurationList
  const buildConfigurationsList = [
    {
      name: 'Debug',
      isa: 'XCBuildConfiguration',
      buildSettings: {
        PRODUCT_NAME: '"$(TARGET_NAME)"',
        SWIFT_VERSION: '5.0',
        TARGETED_DEVICE_FAMILY: '"1,2"',
        INFOPLIST_FILE: `${TARGET_NAME}/Info.plist`,
        CURRENT_PROJECT_VERSION: `"${currentProjectVersion}"`,
        IPHONEOS_DEPLOYMENT_TARGET: `"${deploymentTarget}"`,
        PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
        GENERATE_INFOPLIST_FILE: '"YES"',
        INFOPLIST_KEY_CFBundleDisplayName: TARGET_NAME,
        INFOPLIST_KEY_NSHumanReadableCopyright: '""',
        MARKETING_VERSION: `"${marketingVersion}"`,
        SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
        CODE_SIGN_ENTITLEMENTS: `"${TARGET_NAME}/${TARGET_NAME}.entitlements"`,
        CODE_SIGN_STYLE: '"Automatic"',
        DEVELOPMENT_TEAM: `"${appleTeamId}"`,
        APPLICATION_EXTENSION_API_ONLY: '"YES"',
      },
    },
    {
      name: 'Release',
      isa: 'XCBuildConfiguration',
      buildSettings: {
        PRODUCT_NAME: '"$(TARGET_NAME)"',
        SWIFT_VERSION: '5.0',
        TARGETED_DEVICE_FAMILY: '"1,2"',
        INFOPLIST_FILE: `${TARGET_NAME}/Info.plist`,
        CURRENT_PROJECT_VERSION: `"${currentProjectVersion}"`,
        IPHONEOS_DEPLOYMENT_TARGET: `"${deploymentTarget}"`,
        PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
        GENERATE_INFOPLIST_FILE: '"YES"',
        INFOPLIST_KEY_CFBundleDisplayName: TARGET_NAME,
        INFOPLIST_KEY_NSHumanReadableCopyright: '""',
        MARKETING_VERSION: `"${marketingVersion}"`,
        CODE_SIGN_ENTITLEMENTS: `"${TARGET_NAME}/${TARGET_NAME}.entitlements"`,
        CODE_SIGN_STYLE: '"Automatic"',
        DEVELOPMENT_TEAM: `"${appleTeamId}"`,
        APPLICATION_EXTENSION_API_ONLY: '"YES"',
      },
    },
  ];
  const xCConfigurationList = xcodeProject.addXCConfigurationList(
    buildConfigurationsList,
    'Release',
    `Build configuration list for PBXNativeTarget "${TARGET_NAME}"`
  );

  // Product file
  const productFile = xcodeProject.addProductFile(TARGET_NAME, {
    basename: `${TARGET_NAME}.appex`,
    group: groupName,
    explicitFileType: 'wrapper.app-extension',
    settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    includeInIndex: 0,
    path: `${TARGET_NAME}.appex`,
    sourceTree: 'BUILT_PRODUCTS_DIR',
  });

  // PBXNativeTarget
  const target = {
    uuid: targetUuid,
    pbxNativeTarget: {
      isa: 'PBXNativeTarget',
      name: TARGET_NAME,
      productName: TARGET_NAME,
      productReference: productFile.fileRef,
      productType: '"com.apple.product-type.app-extension"',
      buildConfigurationList: xCConfigurationList.uuid,
      buildPhases: [],
      buildRules: [],
      dependencies: [],
    },
  };
  xcodeProject.addToPbxNativeTargetSection(target);

  // Add to PBXProject
  xcodeProject.addToPbxProjectSection(target);
  const pbxProjectSection = xcodeProject.pbxProjectSection();
  const project = pbxProjectSection[xcodeProject.getFirstProject().uuid];
  if (!project.attributes.TargetAttributes) {
    project.attributes.TargetAttributes = {};
  }
  project.attributes.TargetAttributes[target.uuid] = {
    LastSwiftMigration: 1250,
    DevelopmentTeam: appleTeamId,
  };

  // Target dependency
  xcodeProject.addTargetDependency(xcodeProject.getFirstTarget().uuid, [target.uuid]);

  // Build phases - PBXSourcesBuildPhase primeiro para criar file refs dos Swift
  const buildPath = '""';
  const folderType = 'app_extension';
  xcodeProject.addBuildPhase(swiftFilePaths, 'PBXSourcesBuildPhase', groupName, targetUuid, folderType, buildPath);
  const mainTargetUuid = xcodeProject.getFirstTarget().uuid;
  xcodeProject.addBuildPhase([], 'PBXCopyFilesBuildPhase', groupName, mainTargetUuid, folderType, buildPath);
  xcodeProject
    .buildPhaseObject('PBXCopyFilesBuildPhase', groupName, mainTargetUuid)
    .files.push({
      value: productFile.uuid,
      comment: `${productFile.basename} in ${productFile.group}`,
    });
  xcodeProject.addToPbxBuildFileSection(productFile);
  xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', groupName, targetUuid, folderType, buildPath);

  // PBXGroup - mesmos paths que addBuildPhase para Swift; + Info.plist e entitlements
  const { uuid: pbxGroupUuid } = xcodeProject.addPbxGroup(allGroupFiles, TARGET_NAME, TARGET_NAME);
  if (pbxGroupUuid) {
    const groups = xcodeProject.hash.project.objects['PBXGroup'];
    Object.keys(groups).forEach((key) => {
      if (groups[key].name === undefined && groups[key].path === undefined) {
        xcodeProject.addToPbxGroup(pbxGroupUuid, key);
      }
    });
  }

  return config;
}

module.exports = function withRitmoWidgetXcode(config) {
  return withXcodeProject(config, (config) => {
    return addRitmoWidgetTarget(config);
  });
};
