# CI/CD Strategy

---

## Pipeline Overview

**Platform**: GitHub Actions (free for public repos, affordable for private)

**Branch strategy**:
- `main` — production-ready, branch-protected, requires PR + all CI checks to pass
- `develop` — integration branch, all feature branches merge here first
- `feature/*` — individual feature branches, opened as PRs against `develop`
- `release/*` — optional release branches for EAS builds

**Trigger rules**:
- `push` to `main` or `develop` → run full pipeline
- `pull_request` targeting `main` or `develop` → run full pipeline
- Merge to `main` → trigger EAS production build (manual approval gate)

---

## Pipeline Definition

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # ─── Job 1: Static analysis + unit/integration tests ─────────────────────
  quality:
    name: Quality Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript type check
        run: npx tsc --noEmit

      - name: ESLint
        run: npx eslint src/ --max-warnings 0

      - name: Unit + integration tests
        run: npx jest --coverage --coverageThreshold='{"global":{"lines":70,"functions":70}}'

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # ─── Job 2: E2E tests on Android simulator ───────────────────────────────
  e2e-android:
    name: E2E Tests (Android)
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Start Android emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 33
          script: |
            npx expo start --no-dev --minify &
            sleep 15
            npx maestro test e2e/

  # ─── Job 3: E2E tests on iOS simulator (macOS only) ─────────────────────
  e2e-ios:
    name: E2E Tests (iOS)
    runs-on: macos-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Install Maestro
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "${HOME}/.maestro/bin" >> $GITHUB_PATH
      - run: npx expo prebuild --platform ios
      - run: xcodebuild -workspace ios/FinancialTrack.xcworkspace -scheme FinancialTrack -destination 'platform=iOS Simulator,name=iPhone 16' build
      - run: maestro test e2e/
```

---

## Deployment: EAS Build + EAS Update

**EAS Build** creates native binaries (`.apk`, `.ipa`). Required for any native code change.

**EAS Update** pushes over-the-air (OTA) JS bundle updates. Does not require a new binary. Use for JS-only changes between releases.

**`eas.json`** (update the existing file):
```json
{
  "cli": {
    "version": ">= 14.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_SENTRY_DSN": "..."
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**EAS deployment workflow**:
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  ota-update:
    name: OTA Update (JS-only)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Publish OTA update
        run: npx eas-cli update --branch production --message "Release ${{ github.sha }}"
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

  native-build:
    name: Native Build (manual trigger only)
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Build Android
        run: npx eas-cli build --platform android --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

## Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `EXPO_TOKEN` | EAS CLI authentication |
| `CODECOV_TOKEN` | Coverage reporting |
| `SENTRY_AUTH_TOKEN` | Sentry source map upload |

---

## Branch Protection Rules (set in GitHub repo settings)

For `main`:
- Require PR before merging
- Require status checks: `quality`, `e2e-android`
- Require at least 1 approving review
- Dismiss stale reviews on new pushes
- Do not allow force pushes

---

## Versioning Strategy

Use **semantic versioning** (`MAJOR.MINOR.PATCH`):
- `PATCH`: Bug fixes, OTA-eligible.
- `MINOR`: New features, OTA-eligible if JS-only, native build if new permissions/native modules.
- `MAJOR`: Breaking changes or major native updates — always requires a native build.

The `version` field in `package.json` and `app.json` must be bumped in the same PR as the feature. Use `expo-updates` `runtimeVersion` policy `"appVersion"` to ensure OTA updates only apply to compatible binary versions.
