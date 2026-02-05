const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let podfileContent = fs.readFileSync(podfilePath, "utf8");

      // Add modular headers only for Google/Firebase pods
      if (!podfileContent.includes("pod 'GoogleUtilities', :modular_headers => true")) {
        podfileContent = podfileContent.replace(
          /(use_expo_modules!)/,
          `$1\n\n  # Fix Firebase modular headers\n  pod 'GoogleUtilities', :modular_headers => true\n  pod 'FirebaseCore', :modular_headers => true\n  pod 'FirebaseCoreInternal', :modular_headers => true\n  pod 'FirebaseInstallations', :modular_headers => true\n  pod 'FirebaseABTesting', :modular_headers => true\n  pod 'FirebaseRemoteConfig', :modular_headers => true\n  pod 'FirebaseSharedSwift', :modular_headers => true\n  pod 'FirebaseRemoteConfigInterop', :modular_headers => true`
        );
      }

      // Fix deployment target warnings for pods with outdated targets
      if (!podfileContent.includes("IPHONEOS_DEPLOYMENT_TARGET")) {
        const deploymentTargetFix = `
    # Fix deployment target warnings for pods with outdated targets
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end
  end
end`;
        podfileContent = podfileContent.replace(
          /(\s*end\s*\nend\s*)$/m,
          deploymentTargetFix
        );
      }

      fs.writeFileSync(podfilePath, podfileContent);

      return config;
    },
  ]);
}

module.exports = withModularHeaders;
