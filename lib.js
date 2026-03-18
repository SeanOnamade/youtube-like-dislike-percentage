/**
 * Pure, testable functions for the YouTube Like % extension.
 * Loaded as a content script before content.js; also importable by Vitest.
 */

function getVideoId(href) {
  try {
    return new URL(href).searchParams.get("v") || null;
  } catch {
    return null;
  }
}

function likeColor(percent) {
  const p = Math.max(0, Math.min(100, percent)) / 100;
  return `rgb(${Math.round(255 * (1 - p))}, ${Math.round(255 * p)}, 0)`;
}

function calcPercent(likes, dislikes) {
  if (typeof likes !== "number" || !likes) return null;
  const total = likes + (Number(dislikes) || 0);
  if (total === 0) return null;
  return (likes / total) * 100;
}

function buildCSS(colorValue, pctText, colorEnabled) {
  const colorBlock = colorEnabled
    ? `
      like-button-view-model .yt-spec-button-shape-next__button-text-content,
      like-button-view-model .yt-spec-button-shape-next__button-text-content *,
      like-button-view-model button .yt-spec-button-shape-next__button-text-content,
      like-button-view-model button .yt-spec-button-shape-next__button-text-content *,
      #segmented-like-button like-button-view-model button div.yt-spec-button-shape-next__button-text-content,
      #segmented-like-button like-button-view-model button div.yt-spec-button-shape-next__button-text-content * {
        color: ${colorValue} !important;
      }`
    : "";

  const pctColor = colorEnabled ? colorValue : "#aaa";

  return `${colorBlock}
      ytd-watch-metadata #title h1 yt-formatted-string::after {
        content: "\\00a0\\00a0 ${pctText}";
        color: ${pctColor} !important;
        font-size: 0.7em;
        font-weight: 400;
        vertical-align: middle;
        white-space: nowrap;
      }`;
}

function getRetryDelay(attempt) {
  if (attempt <= 0) return 0;
  return Math.min(1000 * Math.pow(3, attempt - 1), 30000);
}

if (typeof globalThis !== "undefined") {
  globalThis.LikePctLib = { getVideoId, likeColor, calcPercent, buildCSS, getRetryDelay };
}
