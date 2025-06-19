import assert from 'assert';
import { SlidingWindow } from '../src/index';

interface ScrapEvent {
  machineId: string;
  scrapIndex: number;
  value: number;
  timestamp: string;
}

function setNow(fake: number) {
  const real = Date.now;
  Date.now = () => fake;
  return () => { Date.now = real; };
}

const base = Date.now();
const sw = new SlidingWindow(60_000);

let restore = setNow(base - 61_000);
let res = sw.add({ machineId: 'm1', scrapIndex: 1, value: 10, timestamp: new Date(base - 61_000).toISOString() } as ScrapEvent);
assert.deepStrictEqual(res, { sumLast60s: 10, avgLast60s: 10, countLast60s: 1 });
restore();

restore = setNow(base - 50_000);
res = sw.add({ machineId: 'm1', scrapIndex: 1, value: 20, timestamp: new Date(base - 50_000).toISOString() } as ScrapEvent);
assert.deepStrictEqual(res, { sumLast60s: 30, avgLast60s: 15, countLast60s: 2 });
restore();

restore = setNow(base - 10_000);
res = sw.add({ machineId: 'm1', scrapIndex: 1, value: 30, timestamp: new Date(base - 10_000).toISOString() } as ScrapEvent);
assert.deepStrictEqual(res, { sumLast60s: 60, avgLast60s: 20, countLast60s: 3 });
restore();

restore = setNow(base + 12_000);
res = sw.add({ machineId: 'm1', scrapIndex: 1, value: 5, timestamp: new Date(base + 12_000).toISOString() } as ScrapEvent);
assert.deepStrictEqual(res, { sumLast60s: 35, avgLast60s: 17.5, countLast60s: 2 });
restore();

console.log('SlidingWindow aggregation tests passed.');
