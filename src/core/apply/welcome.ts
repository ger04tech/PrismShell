/**
 * Setup.welcome → a "PRISMSHELL" banner printed when a PowerShell tab opens, inside our $PROFILE block.
 * The banner (box-drawing characters + true-colour escapes) is embedded as base64, so the profile
 * stays pure ASCII: Windows PowerShell 5.1 reads BOM-less files as ANSI and would garble it.
 */

/** "ANSI Shadow" letters, 6 rows each. */
const LETTERS: Record<string, string[]> = {
  P: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔═══╝ ", "██║     ", "╚═╝     "],
  R: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██║  ██║", "╚═╝  ╚═╝"],
  I: ["██╗", "██║", "██║", "██║", "██║", "╚═╝"],
  S: ["███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝"],
  M: ["███╗   ███╗", "████╗ ████║", "██╔████╔██║", "██║╚██╔╝██║", "██║ ╚═╝ ██║", "╚═╝     ╚═╝"],
  H: ["██╗  ██╗", "██║  ██║", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  E: ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝"],
  L: ["██╗     ", "██║     ", "██║     ", "██║     ", "███████╗", "╚══════╝"],
};

/** Plain banner rows (no colour), also used by the preview. */
export const WELCOME_ROWS: string[] = Array.from({ length: 6 }, (_, r) =>
  [..."PRISMSHELL"].map((ch) => LETTERS[ch][r]).join(""),
);
export const WELCOME_WIDTH = Math.max(...WELCOME_ROWS.map((row) => [...row].length));

/** The app icon's cyan → violet (same as the wordmark). */
export const WELCOME_FROM = [103, 232, 249] as const;
export const WELCOME_TO = [192, 132, 252] as const;

function colorAt(col: number): string {
  const k = WELCOME_WIDTH <= 1 ? 0 : col / (WELCOME_WIDTH - 1);
  return WELCOME_FROM.map((a, i) => Math.round(a + (WELCOME_TO[i] - a) * k)).join(";");
}

/** Banner text with a left-to-right gradient (a colour change every 2 columns keeps it short). */
export function welcomeAnsi(): string {
  const ESC = "\x1b";
  const lines = WELCOME_ROWS.map((row) => {
    let out = "  ";
    [...row].forEach((ch, col) => {
      if (col % 2 === 0) out += `${ESC}[38;2;${colorAt(col)}m`;
      out += ch;
    });
    return out + `${ESC}[0m`;
  });
  return "\n" + lines.join("\n") + "\n";
}

function toBase64Utf8(text: string): string {
  let bin = "";
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
  return btoa(bin);
}

/** PowerShell lines for the profile block. Narrow windows get one short line instead of a wrapped banner. */
export function buildWelcomeBody(): string {
  const b64 = toBase64Utf8(welcomeAnsi());
  return [
    "# Bienvenida de PrismShell",
    `if ($Host.UI.RawUI.WindowSize.Width -ge ${WELCOME_WIDTH + 4}) {`,
    `  [Console]::Write([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64}')))`,
    "} else {",
    "  Write-Host 'PrismShell' -ForegroundColor Cyan",
    "}",
    'Write-Host ("  Hola, " + $env:USERNAME + "!") -ForegroundColor DarkGray',
    "Write-Host ''",
  ].join("\n");
}
