/** @type {import('jest').Config} */

// Packages that ship untranspiled ES modules and must be transformed by Babel
const esModulePackages = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  'expo(nent)?',
  '@expo(nent)?/.*',
  '@expo-google-fonts/.*',
  'react-navigation',
  '@react-navigation/.*',
  'nativewind',
  'tailwind-merge',
  'react-native-reanimated',
  'react-native-worklets',
].join('|');

module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [`node_modules/(?!(${esModulePackages}))`],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
};
