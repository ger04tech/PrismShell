import { describe, expect, it } from "vitest";
import { isFontInstalled } from "@/data/fonts";

describe("isFontInstalled", () => {
  it("matches the full registry name", () => {
    expect(isFontInstalled("JetBrainsMono Nerd Font", ["JetBrainsMono Nerd Font Regular"])).toBe(true);
  });

  it('matches Nerd Fonts that register as "NF" / "NFM" / "NFP"', () => {
    expect(isFontInstalled("CaskaydiaCove Nerd Font", ["CaskaydiaCove NF Regular"])).toBe(true);
    expect(isFontInstalled("CaskaydiaCove Nerd Font", ["CaskaydiaCove NFM Bold"])).toBe(true);
  });

  it("does not confuse different families", () => {
    expect(isFontInstalled("CaskaydiaCove Nerd Font", ["Cascadia Code Regular", "Cascadia Mono Regular"])).toBe(false);
    expect(isFontInstalled("Hack Nerd Font", ["Hasklug NF Regular"])).toBe(false);
  });

  it("keeps plain fonts as before", () => {
    expect(isFontInstalled("Cascadia Mono", ["Cascadia Mono Regular"])).toBe(true);
  });
});
