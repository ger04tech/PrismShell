import { describe, expect, it } from "vitest";
import { BLOCK_END, BLOCK_START, buildPromptBody, hasBlock, psQuote, removeBlock, upsertBlock } from "./prompt";

const body = buildPromptBody("C:\\Users\\Ana\\AppData\\Roaming\\PrismShell\\themes\\atomic.omp.json");

describe("prompt block", () => {
  it("builds a safe oh-my-posh line", () => {
    expect(body).toBe(
      "oh-my-posh init pwsh --config 'C:\\Users\\Ana\\AppData\\Roaming\\PrismShell\\themes\\atomic.omp.json' | Invoke-Expression",
    );
    expect(psQuote("C:\\O'Brien\\x")).toBe("'C:\\O''Brien\\x'");
  });

  it("creates the block in an empty profile", () => {
    const out = upsertBlock("", body);
    expect(out).toBe(`${BLOCK_START}\r\n${body}\r\n${BLOCK_END}\r\n`);
  });

  it("appends to an existing profile and removes cleanly", () => {
    const original = "Import-Module posh-git\r\nSet-Alias ll Get-ChildItem\r\n";
    const out = upsertBlock(original, body);
    expect(out.startsWith(original)).toBe(true);
    expect(hasBlock(out)).toBe(true);
    expect(removeBlock(out)).toBe(original);
  });

  it("adds a newline when the profile does not end with one", () => {
    const out = upsertBlock("Set-Alias ll Get-ChildItem", body);
    expect(out).toContain("Get-ChildItem\r\n# >>> PrismShell >>>");
    expect(removeBlock(out)).toBe("Set-Alias ll Get-ChildItem\r\n");
  });

  it("replaces the block in place, keeping lines around it", () => {
    const original = `a\n${BLOCK_START}\nold line\n${BLOCK_END}\nb\n`;
    const out = upsertBlock(original, "new line");
    expect(out).toBe(`a\n${BLOCK_START}\nnew line\n${BLOCK_END}\nb\n`);
  });

  it("leaves profiles without our block untouched", () => {
    const original = "# >>> conda initialize >>>\nconda stuff\n# <<< conda initialize <<<\n";
    expect(removeBlock(original)).toBe(original);
  });
});
