(function () {
  "use strict";

  const { getVideoId, likeColor, calcPercent, buildCSS, getRetryDelay } = globalThis.LikePctLib;

  const STYLE_ID = "yt-like-pct-style";
  const API_BASE = "https://returnyoutubedislikeapi.com/votes?videoId=";
  const MAX_RETRIES = 2;
  const MIN_FETCH_GAP_MS = 1000;
  const BACKOFF_429_MS = 30000;

  let colorEnabled = false;
  let lastKey = null;
  let doneId = null;
  let cachedPct = null;
  let retryTimer = null;
  let lastFetchTime = 0;
  let blockedUntil = 0;

  // --- Storage ---

  function loadSettings() {
    chrome.storage.sync.get({ colorEnabled: false }, (result) => {
      colorEnabled = result.colorEnabled;
      if (cachedPct !== null) applyStyles(cachedPct);
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.colorEnabled) {
      colorEnabled = changes.colorEnabled.newValue;
      lastKey = null;
      if (cachedPct !== null) applyStyles(cachedPct);
      else clearStyles();
    }
  });

  // --- CSS injection ---

  function injectCSS(css) {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = css;
  }

  function removeCSS() {
    document.getElementById(STYLE_ID)?.remove();
  }

  function applyStyles(percentValue) {
    if (percentValue === "unknown") {
      const key = "unknown";
      if (lastKey === key) return;
      lastKey = key;
      injectCSS(buildCSS(null, "?%", false));
      return;
    }
    const c = likeColor(percentValue);
    const pctText = percentValue.toFixed(1) + "%";
    const key = c + pctText + colorEnabled;
    if (lastKey === key) return;
    lastKey = key;
    injectCSS(buildCSS(c, pctText, colorEnabled));
  }

  function clearStyles() {
    removeCSS();
    lastKey = null;
  }

  // --- API fetch with retry + rate limiting ---

  function fetchVotes(videoId, attempt) {
    if (attempt === undefined) attempt = 0;

    const now = Date.now();
    if (now < blockedUntil) return Promise.resolve(null);

    const gap = now - lastFetchTime;
    if (gap < MIN_FETCH_GAP_MS) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(fetchVotes(videoId, attempt)), MIN_FETCH_GAP_MS - gap);
      });
    }

    lastFetchTime = Date.now();

    return fetch(API_BASE + videoId)
      .then((r) => {
        if (r.status === 429) {
          blockedUntil = Date.now() + BACKOFF_429_MS;
          return null;
        }
        if (r.status >= 500 && attempt < MAX_RETRIES) {
          return new Promise((resolve) => {
            setTimeout(() => resolve(fetchVotes(videoId, attempt + 1)), getRetryDelay(attempt + 1));
          });
        }
        if (!r.ok) return null;
        return r.json();
      })
      .catch(() => {
        if (attempt < MAX_RETRIES) {
          return new Promise((resolve) => {
            setTimeout(() => resolve(fetchVotes(videoId, attempt + 1)), getRetryDelay(attempt + 1));
          });
        }
        return null;
      });
  }

  // --- Core logic ---

  function currentVideoId() {
    return getVideoId(window.location.href);
  }

  function run() {
    const videoId = currentVideoId();
    if (!videoId) {
      doneId = null;
      cachedPct = null;
      clearStyles();
      return;
    }

    if (doneId === videoId && cachedPct !== null) {
      applyStyles(cachedPct);
      return;
    }

    doneId = videoId;
    cachedPct = null;
    clearTimeout(retryTimer);

    fetchVotes(videoId).then((data) => {
      let result;
      if (!data) {
        result = "unknown";
      } else {
        const pct = calcPercent(data.likes, data.dislikes);
        result = pct === null ? "unknown" : pct;
      }
      cachedPct = result;
      setTimeout(() => {
        if (currentVideoId() !== videoId) return;
        applyStyles(result);
        retryTimer = setTimeout(() => {
          if (currentVideoId() === videoId) applyStyles(result);
        }, 900);
      }, 120);
    });
  }

  function pageHasWatchElements() {
    return !!(
      document.querySelector("#segmented-like-button") ||
      document.querySelector("ytd-watch-metadata")
    );
  }

  function tick() {
    if (pageHasWatchElements()) run();
    else {
      doneId = null;
      cachedPct = null;
      clearStyles();
    }
  }

  function isWatchPage() {
    return document.location.pathname.startsWith("/watch");
  }

  // --- Observers ---

  let debounce = null;
  const observer = new MutationObserver(() => {
    if (!isWatchPage()) return;
    if (debounce) return;
    debounce = setTimeout(() => {
      debounce = null;
      if (cachedPct !== null && currentVideoId() === doneId) applyStyles(cachedPct);
      else tick();
    }, 700);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      doneId = null;
      cachedPct = null;
      if (isWatchPage()) tick();
      else clearStyles();
    }
  }, 500);

  window.addEventListener("resize", () => {
    if (cachedPct !== null) {
      setTimeout(() => applyStyles(cachedPct), 100);
      setTimeout(() => applyStyles(cachedPct), 500);
    }
  });

  // --- Init ---

  function init() {
    loadSettings();
    if (!isWatchPage()) return;
    tick();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
