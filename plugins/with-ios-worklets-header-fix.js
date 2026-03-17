const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const HEADER_FIX_MARKER = '# trainer: expose RNWorklets private headers';
const HEADER_FIX_SNIPPET = `${HEADER_FIX_MARKER}
    installer.pods_project.targets.each do |target|
      next unless target.name == 'ExpoModulesCore'

      target.build_configurations.each do |config|
        inherited = '$(inherited)'
        header_search_paths = Array(config.build_settings['HEADER_SEARCH_PATHS'])
        private_worklets_headers = '"\${PODS_ROOT}/Headers/Private/RNWorklets"'

        next if header_search_paths.include?(private_worklets_headers)

        if header_search_paths.empty?
          config.build_settings['HEADER_SEARCH_PATHS'] = [inherited, private_worklets_headers]
        else
          config.build_settings['HEADER_SEARCH_PATHS'] = header_search_paths + [private_worklets_headers]
        end
      end
    end`;

function applyPodfilePatch(contents) {
  if (contents.includes(HEADER_FIX_MARKER)) {
    return contents;
  }

  const postInstallNeedle = /post_install do \|installer\|\n([\s\S]*?)\n  end/;

  if (!postInstallNeedle.test(contents)) {
    throw new Error(
      'Unable to locate post_install block in ios/Podfile for RNWorklets header fix.',
    );
  }

  return contents.replace(
    postInstallNeedle,
    (match, body) =>
      `post_install do |installer|\n${body}\n${HEADER_FIX_SNIPPET}\n  end`,
  );
}

module.exports = function withIosWorkletsHeaderFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const podfilePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'Podfile',
      );
      const podfileContents = await fs.promises.readFile(podfilePath, 'utf8');
      const patchedPodfile = applyPodfilePatch(podfileContents);
      await fs.promises.writeFile(podfilePath, patchedPodfile);
      return modConfig;
    },
  ]);
};
