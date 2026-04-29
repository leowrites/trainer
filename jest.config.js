/** @type {import('jest').Config} */

module.exports = {
  preset: 'jest-expo',
  testRegex: '.*\\.test\\.[jt]sx?$',
  testPathIgnorePatterns: ['/node_modules/', '/\\.gluestack/', '/\\.npm/'],
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    // Map expo-sqlite and its transitive native deps to manual mocks.
    '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.js',
    '^expo-asset$': '<rootDir>/__mocks__/expo-asset.js',
    '^@lodev09/react-native-true-sheet$':
      '<rootDir>/__mocks__/react-native-true-sheet.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@gluestack-ui/.*|react-aria|react-stately|@legendapp/motion|nativewind)',
  ],
};
