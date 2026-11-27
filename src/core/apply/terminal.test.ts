import { parse } from "jsonc-parser";
import { describe, expect, it } from "vitest";
import { SAMPLE_SETTINGS, SAMPLE_SETUP } from "../__fixtures__/fixtures";
import { fragmentSchemeName } from "./fragment";
import { applySetupToSettings, findProfileOverrides, revertSettings, SettingsParseError } from "./terminal";

const commentLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("//") || l.startsWith("/*") || l.includes("// trailing"));

const parseJsonc = (text: string) => parse(text, [], { allowTrailingComma: true });

describe("applySetupToSettings", () => {
  const { text, previous } = applySetupToSettings(SAMPLE_SETTINGS, SAMPLE_SETUP);
  const json = parseJsonc(text);

  it("writes our keys into profiles.defaults", () => {
    expect(json.profiles.defaults).toEqual({
      padding: "8, 8, 8, 8",
      colorScheme: fragmentSchemeName("TokyoNight Night"),
      font: { face: "CaskaydiaCove Nerd Font", size: 12, weight: "normal" },
      opacity: 85,
      useAcrylic: true,
      cursorShape: "bar",
    });
  });

  it("keeps every comment", () => {
    expect(commentLines(text)).toEqual(commentLines(SAMPLE_SETTINGS));
  });

  it("keeps CRLF line endings", () => {
    expect(text.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("changes nothing outside our keys", () => {
    const before = parseJsonc(SAMPLE_SETTINGS);
    const { defaults: _a, ...profilesBefore } = before.profiles;
    const { defaults: _b, ...profilesAfter } = json.profiles;
    expect(profilesAfter).toEqual(profilesBefore);
    expect({ ...json, profiles: null }).toEqual({ ...before, profiles: null });
  });

  it("records what was there before", () => {
    expect(previous['["profiles","defaults","padding"]']).toEqual({ absent: false, value: "4" });
    expect(previous['["profiles","defaults","opacity"]']).toEqual({ absent: true });
  });

  it("is idempotent", () => {
    const again = applySetupToSettings(text, SAMPLE_SETUP, previous);
    expect(again.text).toBe(text);
  });

  it("keeps the first 'previous' across several applies", () => {
    const second = applySetupToSettings(text, { ...SAMPLE_SETUP, padding: "20" }, previous);
    expect(second.previous['["profiles","defaults","padding"]']).toEqual({ absent: false, value: "4" });
    expect(revertSettings(second.text, second.previous)).toBe(SAMPLE_SETTINGS);
  });

  it("adds and removes the background image keys", () => {
    const withImage = applySetupToSettings(
      text,
      { ...SAMPLE_SETUP, background: { ...SAMPLE_SETUP.background, imageOpacity: 0.3, imageStretchMode: "uniformToFill" } },
      previous,
      { backgroundImagePath: "C:\\bg\\wall.png" },
    );
    const d = parseJsonc(withImage.text).profiles.defaults;
    expect(d.backgroundImage).toBe("C:\\bg\\wall.png");
    expect(d.backgroundImageOpacity).toBe(0.3);

    const without = applySetupToSettings(withImage.text, SAMPLE_SETUP, withImage.previous);
    expect(parseJsonc(without.text).profiles.defaults.backgroundImage).toBeUndefined();
  });

  it("refuses invalid JSON instead of guessing", () => {
    expect(() => applySetupToSettings('{ "profiles": { ', SAMPLE_SETUP)).toThrow(SettingsParseError);
  });

  it("refuses the legacy profiles array", () => {
    expect(() => applySetupToSettings('{ "profiles": [] }', SAMPLE_SETUP)).toThrow(/formato antiguo/);
  });
});

describe("revertSettings", () => {
  it("returns exactly the original file", () => {
    const { text, previous } = applySetupToSettings(SAMPLE_SETTINGS, SAMPLE_SETUP);
    expect(revertSettings(text, previous)).toBe(SAMPLE_SETTINGS);
  });

  it("keeps changes the user made after us", () => {
    const { text, previous } = applySetupToSettings(SAMPLE_SETTINGS, SAMPLE_SETUP);
    const edited = text.replace('"copyOnSelect": false', '"copyOnSelect": true');
    const reverted = revertSettings(edited, previous);
    expect(parseJsonc(reverted).copyOnSelect).toBe(true);
    expect(parseJsonc(reverted).profiles.defaults).toEqual({ padding: "4" });
  });

  it("removes objects we created when they end up empty", () => {
    const minimal = '{\n    "profiles": {\n        "list": []\n    }\n}\n';
    const { text, previous } = applySetupToSettings(minimal, SAMPLE_SETUP);
    expect(parseJsonc(text).profiles.defaults.font.face).toBe("CaskaydiaCove Nerd Font");
    expect(parseJsonc(revertSettings(text, previous))).toEqual(parseJsonc(minimal));
  });

  it("works on a settings.json without profiles at all", () => {
    const bare = "{\n}\n";
    const { text, previous } = applySetupToSettings(bare, SAMPLE_SETUP);
    expect(parseJsonc(revertSettings(text, previous))).toEqual({});
  });
});

describe("findProfileOverrides", () => {
  it("lists profiles that override our keys", () => {
    expect(findProfileOverrides(SAMPLE_SETTINGS)).toEqual([{ name: "PowerShell", keys: ["colorScheme"] }]);
  });
});
