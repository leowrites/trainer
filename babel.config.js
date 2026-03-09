module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // WatermelonDB requires legacy decorators (must come before class-properties).
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ios.tsx',
            '.android.tsx',
            '.ios.js',
            '.android.js',
            '.js',
            '.ts',
            '.tsx',
            '.json',
          ],
          alias: {
            '@': './src',
            '@features': './src/features',
            '@core': './src/core',
            '@shared': './src/shared',
          },
        },
      ],
    ],
  };
};
