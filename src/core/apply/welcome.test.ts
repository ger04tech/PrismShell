import { describe, expect, it } from "vitest";
import { parseSetup } from "../setup";
import { SAMPLE_SETUP } from "../__fixtures__/fixtures";
import { buildWelcomeBody, WELCOME_ROWS, WELCOME_WIDTH, welcomeAnsi } from "./welcome";

describe("welcome banner", () => {
  it("has 6 rows of the same width", () => {
    expect(WELCOME_ROWS).toHaveLength(6);
    for (const row of WELCOME_ROWS) expect([...row].length).toBe(WELCOME_WIDTH);
  });

  it("profile lines are pure ASCII and decode back to the coloured banner", () => {
    const body = buildWelcomeBody();
    expect(/^[\x20-\x7e\n]*$/.test(body)).toBe(true); // safe for BOM-less Windows PowerShell 5.1
    const b64 = /FromBase64String\('([^']+)'\)/.exec(body)![1];
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    expect(new TextDecoder().decode(bytes)).toBe(welcomeAnsi());
    expect(welcomeAnsi()).toContain("\x1b[38;2;");
  });
});

describe("parseSetup", () => {
  it("migrates a v1 setup with the welcome banner off", () => {
    const { welcome: _, ...rest } = SAMPLE_SETUP;
    const v2 = parseSetup({ ...rest, version: 1 });
    expect(v2.version).toBe(2);
    expect(v2.welcome).toBe(false);
  });
});
