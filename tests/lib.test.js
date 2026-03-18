import { describe, it, expect } from "vitest";
import "../lib.js";
const { getVideoId, likeColor, calcPercent, buildCSS, getRetryDelay } = globalThis.LikePctLib;

describe("getVideoId", () => {
  it("extracts v param from watch URL", () => {
    expect(getVideoId("https://www.youtube.com/watch?v=abc123")).toBe("abc123");
  });

  it("extracts v param with extra query params", () => {
    expect(getVideoId("https://www.youtube.com/watch?v=xyz&t=120")).toBe("xyz");
  });

  it("returns null for homepage", () => {
    expect(getVideoId("https://www.youtube.com/")).toBeNull();
  });

  it("returns null for channel page", () => {
    expect(getVideoId("https://www.youtube.com/@SomeChannel")).toBeNull();
  });

  it("returns null for invalid URL", () => {
    expect(getVideoId("not-a-url")).toBeNull();
  });

  it("returns null when v param is missing", () => {
    expect(getVideoId("https://www.youtube.com/watch")).toBeNull();
  });
});

describe("likeColor", () => {
  it("returns pure green at 100%", () => {
    expect(likeColor(100)).toBe("rgb(0, 255, 0)");
  });

  it("returns pure red at 0%", () => {
    expect(likeColor(0)).toBe("rgb(255, 0, 0)");
  });

  it("returns yellow-ish at 50%", () => {
    expect(likeColor(50)).toBe("rgb(128, 128, 0)");
  });

  it("clamps values above 100", () => {
    expect(likeColor(150)).toBe("rgb(0, 255, 0)");
  });

  it("clamps values below 0", () => {
    expect(likeColor(-10)).toBe("rgb(255, 0, 0)");
  });

  it("handles decimal percentages", () => {
    const result = likeColor(99.9);
    expect(result).toMatch(/^rgb\(\d+, \d+, 0\)$/);
  });
});

describe("calcPercent", () => {
  it("calculates correct percentage", () => {
    expect(calcPercent(90, 10)).toBe(90);
  });

  it("returns 100 when no dislikes", () => {
    expect(calcPercent(100, 0)).toBe(100);
  });

  it("handles large numbers", () => {
    const pct = calcPercent(668081, 3299354);
    expect(pct).toBeCloseTo(16.84, 1);
  });

  it("returns null when likes is 0", () => {
    expect(calcPercent(0, 100)).toBeNull();
  });

  it("returns null when likes is not a number", () => {
    expect(calcPercent("100", 10)).toBeNull();
  });

  it("returns null when likes is null", () => {
    expect(calcPercent(null, 10)).toBeNull();
  });

  it("returns null when likes is undefined", () => {
    expect(calcPercent(undefined, 10)).toBeNull();
  });

  it("treats non-numeric dislikes as 0", () => {
    expect(calcPercent(50, "bad")).toBe(100);
  });

  it("treats null dislikes as 0", () => {
    expect(calcPercent(50, null)).toBe(100);
  });
});

describe("buildCSS", () => {
  it("includes color block when colorEnabled is true", () => {
    const css = buildCSS("rgb(0, 255, 0)", "99.9%", true);
    expect(css).toContain("color: rgb(0, 255, 0) !important");
    expect(css).toContain("like-button-view-model");
    expect(css).toContain("99.9%");
  });

  it("omits color block when colorEnabled is false", () => {
    const css = buildCSS("rgb(0, 255, 0)", "99.9%", false);
    expect(css).not.toContain("like-button-view-model");
    expect(css).toContain("99.9%");
    expect(css).toContain("#aaa");
  });

  it("always includes the percentage pseudo-element", () => {
    const cssOn = buildCSS("rgb(255, 0, 0)", "15.1%", true);
    const cssOff = buildCSS("rgb(255, 0, 0)", "15.1%", false);
    expect(cssOn).toContain("::after");
    expect(cssOff).toContain("::after");
    expect(cssOn).toContain("15.1%");
    expect(cssOff).toContain("15.1%");
  });

  it("uses the color value for percentage when color is enabled", () => {
    const css = buildCSS("rgb(128, 128, 0)", "50.0%", true);
    expect(css).toContain("color: rgb(128, 128, 0) !important");
  });

  it("uses gray for percentage when color is disabled", () => {
    const css = buildCSS("rgb(128, 128, 0)", "50.0%", false);
    expect(css).toContain("color: #aaa !important");
  });

  it("renders '?%' for unknown ratio with null colorValue", () => {
    const css = buildCSS(null, "?%", false);
    expect(css).toContain('content: "\\00a0\\00a0 ?%"');
    expect(css).toContain("color: #aaa !important");
    expect(css).not.toContain("like-button-view-model");
    expect(css).toContain("::after");
  });
});

describe("getRetryDelay", () => {
  it("returns 0 for attempt 0", () => {
    expect(getRetryDelay(0)).toBe(0);
  });

  it("returns 1000ms for first retry", () => {
    expect(getRetryDelay(1)).toBe(1000);
  });

  it("returns 3000ms for second retry", () => {
    expect(getRetryDelay(2)).toBe(3000);
  });

  it("returns 9000ms for third retry", () => {
    expect(getRetryDelay(3)).toBe(9000);
  });

  it("caps at 30000ms", () => {
    expect(getRetryDelay(10)).toBe(30000);
  });

  it("returns 0 for negative attempts", () => {
    expect(getRetryDelay(-1)).toBe(0);
  });
});
