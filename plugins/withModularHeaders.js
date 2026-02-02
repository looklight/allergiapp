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
          `$1\n\n  # Fix Firebase modular headers\n  pod 'GoogleUtilities', :modular_headers => true\n  pod 'FirebaseCore', :modular_headers => true\n  pod 'FirebaseCoreInternal', :modular_headers => true\n  pod 'FirebaseInstallations', :modular_headers => true`
        );
        fs.writeFileSync(podfilePath, podfileContent);
      }

      return config;
    },
  ]);
}

module.exports = withModularHeaders;
