import { describe, expect, it } from "vitest";
import { SetupSchema } from "@/core/setup";
import { PRESETS, presetSetup } from "@/data/presets";
import { PROMPT_THEMES } from "@/data/prompts";

describe("presets", () => {
  it.each(PRESETS.map((p) => [p.id, p] as const))("%s builds a valid Setup", (_id, preset) => {
    const setup = presetSetup(preset);
    expect(SetupSchema.safeParse(setup).success).toBe(true);
    expect(PROMPT_THEMES.some((t) => t.id === preset.prompt)).toBe(true);
  });

  it("has unique ids", () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });
});
