import { describe, expect, it } from "vitest";
import { toPreviewSvg } from "./promptArt";

const sample = `<svg xmlns="http://www.w3.org/2000/svg" width="200.00" height="61.35" viewBox="6.00 34.43 200.00 61.35" font-family="PSHack" font-size="16px">
<defs><style>@font-face{font-family:'PSHack';src:url(data:font/woff2;base64,AAAA)}</style></defs>
<rect x="6.00" y="34.43" width="200.00" height="61.35" fill="#16171e"/>
<rect x="16" y="44.48" width="57.8" height="18.81" fill="#0077c2"/>
<text xml:space="preserve" x="16" y="59.43" textLength="57.8" fill="#ffffff"> zsh </text>
<text xml:space="preserve" x="16" y="81.78" textLength="19.27" fill="#007acc">❯ </text>
<text xml:space="preserve" x="35.27" y="81.78" textLength="9.63" fill="#ffffff">_</text>

</svg>`;

describe("toPreviewSvg", () => {
  const result = toPreviewSvg(sample)!;

  it("drops the flat background but keeps the segments", () => {
    expect(result.svg).not.toContain('fill="#16171e"');
    expect(result.svg).toContain('fill="#0077c2"');
  });

  it("trims the padding", () => {
    expect(result.svg).toContain('viewBox="16.00 44.43 180.00 41.35"');
    expect(result.geometry.width).toBeCloseTo(180);
    expect(result.geometry.height).toBeCloseTo(41.35);
  });

  it("removes the fake cursor and reports where the command goes", () => {
    expect(result.svg).not.toMatch(/>_<\/text>/);
    expect(result.geometry.cursorX).toBeCloseTo(35.27 - 16);
    expect(result.geometry.cursorTop).toBeCloseTo(81.78 - 15 - 44.43);
  });

  it("keeps an underscore that is part of the prompt", () => {
    const withPath = sample.replace("> zsh <", ">_ <");
    expect(toPreviewSvg(withPath)!.svg).toContain(">_ <");
  });

  it("returns null for anything that is not one of our images", () => {
    expect(toPreviewSvg("<svg></svg>")).toBeNull();
  });

  it("finds the cursor in every bundled theme image", () => {
    const images = import.meta.glob<string>("../../assets/prompt-themes/*.svg", {
      query: "?raw",
      import: "default",
      eager: true,
    });
    const entries = Object.entries(images);
    expect(entries.length).toBeGreaterThan(20);
    for (const [path, raw] of entries) {
      const out = toPreviewSvg(raw);
      expect(out, path).not.toBeNull();
      expect(out!.svg, path).not.toMatch(/>_<\/text>/);
      expect(out!.geometry.cursorX, path).toBeGreaterThan(0);
      expect(out!.geometry.cursorTop, path).toBeGreaterThanOrEqual(-1);
    }
  });
});
