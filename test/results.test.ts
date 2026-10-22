import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Prepared, RenderResult } from '@reonarudo/gnuplot-renderer';
import { resultCache } from '../src/results';

const input = (identity: string) => ({ identity }) as Prepared;

test('results are cached by identity in a bounded LRU', () => {
  const calls: string[] = [];
  const cache = resultCache((prepared) => { calls.push(prepared.identity); return { status: 'success', output: '<svg/>', notes: [] }; }, 2);
  cache.render(input('a')); cache.render(input('a'));
  assert.deepEqual(calls, ['a']);
  cache.render(input('b')); cache.render(input('a')); cache.render(input('c')); cache.render(input('b'));
  assert.deepEqual(calls, ['a', 'b', 'c', 'b']);
  cache.clear();
  cache.render(input('a'));
  assert.deepEqual(calls, ['a', 'b', 'c', 'b', 'a']);
});

test('timeouts and failures are kept; unavailable is retried', () => {
  for (const [result, expected] of [
    [{ status: 'timeout', budget: 3000 }, 1],
    [{ status: 'failure', message: 'bad' }, 1],
    [{ status: 'unavailable', reason: 'down' }, 2]
  ] as [RenderResult, number][]) {
    let calls = 0;
    const cache = resultCache(() => { calls++; return result; });
    assert.deepEqual(cache.render(input('x')), result);
    cache.render(input('x'));
    assert.equal(calls, expected, result.status);
  }
});
