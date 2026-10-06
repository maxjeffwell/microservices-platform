import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpuToMillicores, memoryToBytes, countToInt } from '../lib/quantity.js';

test('cpu quantities normalise to millicores', () => {
  assert.equal(cpuToMillicores('250m'), 250);
  assert.equal(cpuToMillicores('1'), 1000);
  assert.equal(cpuToMillicores('0.5'), 500);
  assert.equal(cpuToMillicores('1500000n'), 2); // 1.5 millicores, rounded
  assert.equal(cpuToMillicores('123u'), 0);
  assert.equal(cpuToMillicores(undefined), 0);
  assert.equal(cpuToMillicores(''), 0);
});

test('memory quantities normalise to bytes', () => {
  assert.equal(memoryToBytes('128Mi'), 134217728);
  assert.equal(memoryToBytes('1Gi'), 1073741824);
  assert.equal(memoryToBytes('500M'), 500000000);
  assert.equal(memoryToBytes('1024'), 1024);
  assert.equal(memoryToBytes('38711196Ki'), 38711196 * 1024);
  assert.equal(memoryToBytes(null), 0);
});

test('counts', () => {
  assert.equal(countToInt('4'), 4);
  assert.equal(countToInt(undefined), 0);
  assert.equal(countToInt('x'), 0);
});
