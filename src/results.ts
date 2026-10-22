import type { Prepared, RenderResult } from '@reonarudo/gnuplot-renderer';

export interface ResultCache {
  render(prepared: Prepared): RenderResult;
  clear(): void;
}

/**
 * The library does not cache (ADR 0003), and the preview re-renders the whole document on every
 * edit, so results are kept here, keyed by the prepared input's identity: a digest of the fence
 * body and its data files' contents.
 *
 * Timeouts are kept too. Rendering a runaway fence again would block the extension host for the
 * full budget on every refresh. **Gnuplot: Refresh Data** clears the cache, so a timed-out plot
 * can be retried. `unavailable` is not kept: it describes the engine, not the fence.
 */
export function resultCache(render: (prepared: Prepared) => RenderResult, maxEntries = 96): ResultCache {
  const cache = new Map<string, RenderResult>();
  return {
    render(prepared) {
      let result = cache.get(prepared.identity);
      if (result) {
        cache.delete(prepared.identity);
      } else {
        result = render(prepared);
        if (result.status === 'unavailable') return result;
      }
      cache.set(prepared.identity, result);
      if (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
      return result;
    },
    clear: () => cache.clear()
  };
}
