# YouTube Like %

A minimal Chrome extension that shows the **like percentage** on YouTube watch pages.

- The **percentage** (e.g. "99.9%") appears next to the video title via a CSS pseudo-element -- no DOM injection, no layout shifts.
- Optionally **color the like count text** green-to-red based on the ratio (off by default, toggle via the extension popup).
- Uses the [Return YouTube Dislike API](https://returnyoutubedislike.com/) -- works with or without the RYD extension.

## Install

1. Clone or download this repo.
2. Open Chrome, go to **Extensions** > **Manage extensions** > turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Open any YouTube video -- the percentage will appear after the title.

## Usage

- Click the extension icon in the toolbar to open the popup.
- Toggle **Color like count** to enable/disable coloring the like button text green (high ratio) to red (low ratio). Off by default.
- The percentage next to the title is always shown regardless of the color setting.

## How it works

- On `/watch` pages, the extension calls the RYD API to get like and dislike counts.
- It computes `likes / (likes + dislikes) * 100` and injects a single `<style>` tag that:
  - Appends the percentage after the video title using a `::after` pseudo-element.
  - Optionally colors the like count text green-to-red (when enabled in settings).
- API calls use retry with exponential backoff (up to 2 retries), rate limiting (1s minimum gap), and 429 back-off (30s).
- A `MutationObserver` re-applies styles when YouTube re-renders, and a URL poll detects SPA navigation.
- The color toggle state is persisted via `chrome.storage.sync`.

## Tests

```bash
npm install
npm test
```

Runs [Vitest](https://vitest.dev/) tests covering the pure functions in `lib.js`:
- `getVideoId` -- URL parsing for watch pages
- `likeColor` -- green-to-red color gradient calculation
- `calcPercent` -- like/dislike percentage with edge cases
- `buildCSS` -- CSS generation with color toggle
- `getRetryDelay` -- exponential backoff timing

## Limitations

- The RYD public API does not have accurate data for every video. For some older or high-profile videos, the API may return zero likes; in those cases the extension shows a gray **?** next to the title instead of a percentage. The same **?** appears if the API is down or unreachable. The RYD browser extension uses additional internal data sources that this simple API call does not have access to.
## Files

| File | Description |
|------|-------------|
| `manifest.json` | Chrome extension manifest (Manifest V3) |
| `lib.js` | Pure functions: URL parsing, color math, CSS generation, retry delays |
| `content.js` | Content script: fetches votes, injects CSS, handles storage and observers |
| `popup.html` | Extension popup UI with color toggle |
| `popup.js` | Popup logic: reads/writes `colorEnabled` to `chrome.storage.sync` |
| `tests/lib.test.js` | Vitest test suite for `lib.js` |

## Privacy policy

YouTube Like % does **not** collect, store, or transmit any personal data. The only data persisted is a single boolean preference (color toggle on/off) saved locally via `chrome.storage.sync`. The extension sends the current video ID to the [Return YouTube Dislike API](https://returnyoutubedislike.com/) solely to retrieve public like/dislike counts -- no user-identifiable information is included in these requests.
