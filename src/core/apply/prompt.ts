/**
 * Setup → Oh My Posh line inside a marked block of the PowerShell $PROFILE.
 * Only the text between the markers is ever touched.
 */

export const BLOCK_START = "# >>> PrismShell >>>";
export const BLOCK_END = "# <<< PrismShell <<<";

const BLOCK_RE = /^[ \t]*# >>> PrismShell >>>[ \t]*\r?\n[\s\S]*?^[ \t]*# <<< PrismShell <<<[ \t]*(\r?\n|$)/m;

/** PowerShell single-quoted string: only `'` needs escaping (as `''`). */
export function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildPromptBody(configPath: string): string {
  return `oh-my-posh init pwsh --config ${psQuote(configPath)} | Invoke-Expression`;
}

/** Keeps the file's line endings; Windows default (CRLF) when there are none yet. */
function eolOf(text: string): string {
  if (text.includes("\r\n")) return "\r\n";
  return text.includes("\n") ? "\n" : "\r\n";
}

export function hasBlock(profileText: string): boolean {
  return BLOCK_RE.test(profileText);
}

/** Inserts the block at the end, or replaces an existing one in place. */
export function upsertBlock(profileText: string, body: string): string {
  const eol = eolOf(profileText);
  const block = [BLOCK_START, ...body.split(/\r?\n/), BLOCK_END].join(eol) + eol;

  if (hasBlock(profileText)) {
    return profileText.replace(BLOCK_RE, block);
  }
  if (profileText.length === 0) return block;
  const sep = profileText.endsWith("\n") ? "" : eol;
  return profileText + sep + block;
}

/** Removes our block (and nothing else). */
export function removeBlock(profileText: string): string {
  return profileText.replace(BLOCK_RE, "");
}
