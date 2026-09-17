import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';
const elements = new Set('svg g defs path rect circle ellipse line polyline polygon text tspan title desc use clipPath pattern linearGradient radialGradient stop filter feFlood feComposite feBlend'.split(' '));
const attributes = new Set('id x y x1 y1 x2 y2 dx dy cx cy r rx ry width height viewBox preserveAspectRatio d points transform fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset opacity font-family font-size font-weight font-style text-anchor dominant-baseline textLength lengthAdjust rotate clip-path clipPathUnits patternUnits patternTransform patternContentUnits gradientUnits gradientTransform offset stop-color stop-opacity filter filterUnits result in in2 operator mode flood-color flood-opacity color xmlns xmlns:xlink href xlink:href'.split(' '));
const svgNamespace = 'http://www.w3.org/2000/svg';
/** Parse as XML and allow only passive SVG geometry, text, and local references. */
export function sanitizeSvg(source: string): string {
  if (source.length > 4_000_000 || /<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('Unsafe or oversized SVG output.');
  const doc = new DOMParser({onError: () => { throw new Error('Invalid SVG output.'); }}).parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.tagName !== 'svg' || root.namespaceURI !== svgNamespace) throw new Error('Gnuplot did not produce an SVG plot.');
  function clean(el: Element): void {
    for (const attr of Array.from(el.attributes)) {
      const value = attr.value;
      const localReference = /^#[A-Za-z_][\w:.-]*$/.test(value);
      const localUrl = /^url\(#[A-Za-z_][\w:.-]*\)$/.test(value);
      if (!attributes.has(attr.name) ||
          ((attr.name === 'href' || attr.name === 'xlink:href') && !localReference) ||
          (/url\s*\(/i.test(value) && !localUrl) ||
          /[\\]|javascript:|data:|https?:|\/\//i.test(value) && !attr.name.startsWith('xmlns')) {
        el.removeAttributeNode(attr);
      }
    }
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 1) {
        const element = child as Element;
        if (element.namespaceURI !== svgNamespace || !elements.has(element.tagName)) el.removeChild(child);
        else clean(element);
      } else if (child.nodeType !== 3) el.removeChild(child);
    }
  }
  clean(root);
  return new XMLSerializer().serializeToString(root);
}
/** Every occurrence needs unique IDs, even when it uses a cached SVG. */
export function namespaceSvg(svg: string, prefix: string): string {
  return svg.replace(/\bid="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/(\b(?:xlink:)?href=")#/g, `$1#${prefix}`)
    .replace(/url\(#/g, `url(#${prefix}`);
}
