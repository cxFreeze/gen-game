import assert from 'node:assert/strict';
import test from 'node:test';
import { getChunkKey, getNeighborChunks } from '../src/engine/world/chunk-coordinates.ts';
import { createRenderQueue } from '../src/engine/world/render-queue.ts';
import { Random } from '../src/engine/utils/random.ts';
import { loadTypeScript } from './load-typescript.mjs';

const { createWorldPlacement } = loadTypeScript('../src/engine/world/world-placement.ts', {
    './chunk-coordinates': { getChunkKey, getNeighborChunks },
});

test('chunk coordinates preserve rounding at positive and negative boundaries', () => {
    assert.equal(getChunkKey(249, -249, 500), '0/0');
    assert.equal(getChunkKey(250, -250, 500), '500/0');
    assert.equal(getChunkKey(751, -751, 500), '1000/-1000');
    const chunks = getNeighborChunks('500/-500', 500);
    assert.equal(chunks.length, 9);
    assert.equal(new Set(chunks).size, 9);
    assert.ok(chunks.includes('500/-500'));
    assert.ok(chunks.includes('0/-1000'));
    assert.ok(chunks.includes('1000/0'));
});

test('render batches preserve order and wait for consecutive idle frames before announcing readiness', () => {
    const rendered = [];
    let readyCount = 0;
    const queue = createRenderQueue({ batchSize: 2, idleFrameCount: 2, onReady: () => readyCount++ });
    queue.processFrame();
    assert.equal(readyCount, 0);
    for (const item of [1, 2, 3]) {
        queue.enqueue(() => rendered.push(item));
    }
    queue.processFrame();
    assert.deepEqual(rendered, [1, 2]);
    queue.processFrame();
    queue.enqueue(() => rendered.push(4));
    queue.processFrame();
    queue.processFrame();
    assert.equal(readyCount, 0);
    queue.processFrame();
    assert.deepEqual(rendered, [1, 2, 3, 4]);
    assert.equal(readyCount, 1);
    queue.processFrame();
    assert.equal(readyCount, 1);
});

test('clearing a render queue discards pending scene operations', () => {
    let rendered = false;
    let ready = false;
    const queue = createRenderQueue({ batchSize: 1, idleFrameCount: 0, onReady: () => {
        ready = true;
    } });
    queue.enqueue(() => {
        rendered = true;
    });
    queue.clear();
    queue.processFrame();
    assert.equal(rendered, false);
    assert.equal(ready, false);
});

test('seeded placement remains reproducible and keeps spawn positions inside their chunks', () => {
    const options = {
        randomNumber: seed => Random.randomNumber(seed),
        randomBool: (seed, probability) => Random.randomBool(seed, probability),
        chunkSize: 500,
        biomeChunkSize: 1000,
        worldSize: 10000,
        hugeSizeChance: 5,
        hugeSizeRatio: 3,
        playerSpawn: { x: 0, y: 0, minDistance: 200 },
    };
    const placement = createWorldPlacement(options);
    Random.setSeed('refactor');
    const position = placement.getRandomPositionInChunk(500, -500, 'blob', 1);
    const count = placement.getSpawnNumber(3, 'blob', 500, -500);
    Random.setSeed('another-session');
    Random.setSeed('refactor');
    assert.deepEqual(placement.getRandomPositionInChunk(500, -500, 'blob', 1), position);
    assert.equal(placement.getSpawnNumber(3, 'blob', 500, -500), count);
    assert.ok(position.x >= 250 && position.x <= 750);
    assert.ok(position.y >= -750 && position.y <= -250);
    assert.equal(placement.isTooCloseToPlayerSpawn(199, 0), true);
    assert.equal(placement.isTooCloseToPlayerSpawn(200, 0), false);
});
