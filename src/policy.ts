/** Ignore quoted labels/comments when detecting output-control commands. */
export function checkOutputPolicy(source: string): void {
  const code = source.replace(/\\\r?\n/g, '').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[^\n]*/g, ' ');
  if (/\b(?:set|unset)\s+(?:term(?:i(?:n(?:a(?:l)?)?)?)?|out(?:p(?:u(?:t)?)?)?)\b/i.test(code)) {
    throw new Error('The preview controls terminal and output. Remove set terminal / set output commands.');
  }
}
