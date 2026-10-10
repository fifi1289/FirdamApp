# Firdam iPhone and Android app

Expo SDK 57 app that uses the same Supabase backend as firdam.com.

## Try it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. Every push that changes `mobile/` publishes the app to Expo (the "Mobile preview"
   GitHub Action). Open the latest run's summary and scan the QR code with your
   phone's camera.

## Develop

```bash
cd mobile
npm ci
npx expo start        # then scan the QR code with Expo Go
npx tsc --noEmit      # type check
npx expo-doctor       # check packages and config
```

Screens live in `src/app/` (Expo Router). Shared pieces: `src/components/`,
`src/lib/` (Supabase client, sign-in), `src/theme.ts` (colours and fonts).
