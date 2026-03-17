# Development Builds

This repo now treats Expo Go as a temporary playground and relies on Expo development builds for device testing. The strategy ensures we can install native-capable libraries (liquid glass, gluestack, etc.) without waiting for Expo Go to publish the exact SDK version.

## Essentials

- `expo-dev-client` is already added so we can launch a custom dev client with `expo start --dev-client`.
- `eas.json` defines a `development` profile that produces on-device builds with `developmentClient: true`.
- Developers should run `npm run prebuild` (which now wraps `expo prebuild --no-install`) after changing native configuration.

## Typical workflow

1. Install the EAS CLI: `npm install -g eas-cli` or follow [Expo’s CLI guide](https://docs.expo.dev/eas/cli/).
2. Run `npm run prebuild` to generate native projects when necessary (native-sources are kept under version control, so pass `--no-install` to avoid node_modules churn).
3. Build a development client:
   - iOS: `npm run eas:build:ios`
   - Android: `npm run eas:build:android`
4. Install the build onto your device:
   - iOS: use `npx expo client:install:ios` or the generated IPA.
   - Android: download the APK/Bundle URL from the EAS build page.
5. Start the Metro server with `npm run start:dev-client` and open the installed dev client.

## Why this matters

- Allows us to install native-focused libraries (liquid glass, new component libraries) without Expo Go compatibility concerns.
- Keeps us ready for future builds that require the React Native New Architecture mandated by SDK 55.
- The `prebuild` script keeps native scaffolding in sync and documents a repeatable process.

## Troubleshooting

- If `eas build` fails, run `expo doctor` (once Node can load `simdjson`) and resolve warnings before rerunning.
- The dev client workflow assumes you have an Apple Developer certificate and/or Android keystore configured in EAS; follow the [EAS build setup guide](https://docs.expo.dev/build/introduction/).
