# Kiln

Kiln is an unofficial mobile client for Expo services. It connects directly to Expo with the user's personal access token; no shared secret or Kiln account is involved.

## Run locally

Requirements: pnpm, Node 22.13 or newer, and the normal Expo iOS/Android toolchain.

```bash
pnpm install
pnpm exec expo start --dev-client
```

Kiln uses `react-native-mmkv` v4 and Nitro Modules, so it needs a development build rather than Expo Go:

```bash
pnpm exec expo run:ios
pnpm exec expo run:android
```

Cloud development build:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

Create a token at [Expo access-token settings](https://expo.dev/settings/access-tokens), then paste it into Kiln. The token is validated before it is stored.

## Checks

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm exec expo lint
pnpm schema:check   # validates GraphQL documents against eas-cli's schema
pnpm dlx expo-doctor
```

Do not commit tokens, put them in route parameters, or attach them to log and artifact URL requests. The GraphQL transport is the only code that creates the Expo authorization header.

Architecture, internal API provenance and the current capability matrix live in [`docs/`](./docs).
