# Publishing Firdam to the App Store and Google Play

## 1. Accounts (one time)

| Store | Where | Cost | Notes |
|---|---|---|---|
| Apple | developer.apple.com/programs | $99 / year | Enrol as an **organisation** if you have a company (needs a D-U-N-S number, free, ~1 week) or as an individual (faster, your name shows as the seller). |
| Google | play.google.com/console | $25 once | New **personal** accounts must run a closed test with **12 testers for 14 days** before going public. Organisation accounts skip this. |
| Expo | expo.dev (account `firdam-app`) | Free tier is enough | Builds the apps in the cloud. |

## 2. Build the apps

1. In GitHub → Settings → Secrets → Actions, make sure `EXPO_TOKEN` exists (expo.dev → Account settings → Access tokens).
2. **First build only, from a computer** (Expo has to create signing keys and asks you to sign in to Apple):
   ```
   cd mobile
   npm install
   npx eas-cli login
   npx eas-cli build --platform all --profile production
   ```
   Answer **Yes** when it offers to create the iOS certificate/provisioning profile and the Android keystore. Expo stores them safely; don't lose access to the `firdam-app` Expo account.
3. Later builds: GitHub → Actions → **Mobile store build** → Run workflow.

## 3. Submit

- **Apple:** create the app in App Store Connect (My Apps → + → bundle ID `com.firdam.app`), then `npx eas-cli submit -p ios --latest`. It lands in TestFlight; then fill the listing and press "Submit for Review".
- **Google:** create the app in Play Console. Upload the **first** `.aab` by hand (Testing → Internal testing → Create release). After that, `npx eas-cli submit -p android --latest` works once you add a Google service-account JSON key to Expo (Expo guide: "Creating a Google Service Account").

## 4. Listing text

**Name:** Firdam – Muslim Family App
**Subtitle (Apple, 30 chars):** Prayer, Qibla & halal meals
**Short description (Google, 80 chars):** Prayer times, Qibla, halal places near you and halal family meal planning.

**Description:**
> Firdam brings the daily needs of a Muslim family into one calm app.
>
> • Prayer times for where you are, with adjustable calculation methods
> • Qibla direction
> • Halal restaurants, butchers, groceries and mosques near you, with directions
> • A family kitchen: 1,600+ halal recipes, weekly meal plans, a pantry and a shopping list that adds up quantities across recipes
> • Allergy-aware: recipes that contain a family member's allergens are kept out of "safe for my family"
> • Halal by design: pork, alcohol and other haram ingredients can't be added to the pantry or shopping list, and the AI chef will never suggest them
>
> Plan the week, cook from what you have, and never miss a prayer.

**Keywords (Apple, 100 chars):** muslim,prayer times,qibla,halal,salah,azan,islam,meal planner,recipes,family,mosque,halal food
**Category:** Lifestyle (secondary: Food & Drink)
**Age rating:** 4+ / Everyone
**Support URL:** https://firdam.com/support  ·  **Privacy policy:** https://firdam.com/privacy  ·  **Marketing:** https://firdam.com

## 5. Screenshots

Needed: iPhone 6.9" (1320×2868) — 3 to 10 images; Android phone — 2 to 8 images; Google feature graphic 1024×500.
Suggested order: Home with next prayer → Qibla → Halal places map/list → Weekly meal plan → Recipe with ingredients → Shopping list.
Take them on a simulator/phone with a filled demo account.

## 6. Privacy answers

Data the app collects (all **linked to the user**, **not used for tracking**, not sold):
- Contact info: email address (account)
- Location: precise location — only when the user taps "Use my location", for prayer times and nearby halal places (app functionality)
- User content: family members, allergies, pantry, shopping list, meal plans, photos of receipts (app functionality)
- Identifiers: user ID (app functionality)

Google Data safety extras: data is encrypted in transit — **Yes**; users can request deletion — **Yes** (in app: Family → Delete my account, and at firdam.com/support).

## 7. Review notes (paste into both stores)

> Demo account: review@firdam.com / <password>  — create this account on firdam.com first and fill it with a family, a meal plan and a few pantry items.
> The app sells nothing in-app; there are no purchases or subscriptions in the mobile app. Account deletion: Family tab → Delete my account. Location is optional and only used for prayer times and nearby halal places.

## 8. Things that commonly get rejected

- No demo account, or the demo account is empty → create and fill it.
- Mentioning prices or "upgrade on our website" inside the iOS app → the app has none; keep it that way.
- Screenshots that don't match the app → take them from the real build.
