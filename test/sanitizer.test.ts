import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSvg, namespaceSvg } from '../src/sanitizer';
const wrap = (content: string) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${content}</svg>`;
test('removes executable markup and remote resources', () => {
  const output = sanitizeSvg(wrap('<script>alert(1)</script><foreignObject><div>bad</div></foreignObject><image href="https://bad"/><g onclick="bad()" style="fill:url(https://bad)"><path fill="url(https://bad)"/><use xlink:href="javascript:bad()"/><animate attributeName="href"/></g>'));
  assert.doesNotMatch(output,/script|foreignObject|image|onclick|style=|https:|javascript:|animate/);
});
test('preserves geometry, enhanced text, local use references and filters', () => {
  const svg = sanitizeSvg(wrap('<defs><path id="p" d="M0 0L1 1"/></defs><use xlink:href="#p"/><text><tspan font-size="12">α &amp; β</tspan></text>'));
  assert.match(svg,/xlink:href="#p"/); assert.match(svg, /α &amp; β/);
  assert.match(namespaceSvg(svg,'one-'), /id="one-p"/);
  assert.match(namespaceSvg(svg,'one-'), /href="#one-p"/);
});
test('rejects malformed, entity-bearing and non-SVG documents', () => {
  for (const source of ['<html/>','<!DOCTYPE svg [<!ENTITY a "bad">]>'+wrap(''),wrap('<path>')]) assert.throws(() => sanitizeSvg(source));
});
