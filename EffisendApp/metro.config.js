const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['browser', 'require', 'react-native'];
config.resolver.sourceExts.push('cjs', 'mjs');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Intercept problematic @noble/hashes/crypto.js imports to bypass Metro's package exports warnings
  if (moduleName === '@noble/hashes/crypto' || moduleName === '@noble/hashes/crypto.js') {
    try {
      // Resolve the main entry of the package first to find the correct nested node_modules path
      const mainResolve = context.resolveRequest(context, '@noble/hashes', platform);
      if (mainResolve && mainResolve.type === 'sourceFile') {
        let currentDir = path.dirname(mainResolve.filePath);
        // Find the package.json root
        while (currentDir && currentDir !== path.parse(currentDir).root) {
          if (fs.existsSync(path.join(currentDir, 'package.json'))) {
            const targetPath = path.join(currentDir, 'crypto.js');
            if (fs.existsSync(targetPath)) {
              return {
                type: 'sourceFile',
                filePath: targetPath,
              };
            }
            break;
          }
          currentDir = path.resolve(currentDir, '..');
        }
      }
    } catch (err) {}
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;