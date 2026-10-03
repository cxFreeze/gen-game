import assert from 'node:assert/strict';
import test from 'node:test';
import { getChunkKey, getNeighborChunks } from '../src/game/gameplay/world/chunk-coordinates.ts';
import { Random } from '../src/game/math/random.ts';
import { loadTypeScript } from './load-typescript.mjs';

const { RenderQueue } = loadTypeScript('../src/game/rendering/world/render-queue.ts');
const { WorldPlacement } = loadTypeScript('../src/game/gameplay/world/world-placement.ts', {
    './chunk-coordinates': { getChunkKey, getNeighborChunks },
    '../../math/random': { Random },
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
    const queue = new RenderQueue(2, 2);
    const processFrame = () => {
        if (queue.processFrame()) {
            readyCount++;
        }
    };
    processFrame();
    assert.equal(readyCount, 0);
    for (const item of [1, 2, 3]) {
        queue.enqueue(() => rendered.push(item));
    }
    processFrame();
    assert.deepEqual(rendered, [1, 2]);
    processFrame();
    queue.enqueue(() => rendered.push(4));
    processFrame();
    processFrame();
    assert.equal(readyCount, 0);
    processFrame();
    assert.deepEqual(rendered, [1, 2, 3, 4]);
    assert.equal(readyCount, 1);
    processFrame();
    assert.equal(readyCount, 1);
});

test('clearing a render queue discards pending scene operations', () => {
    let rendered = false;
    const queue = new RenderQueue(1, 0);
    queue.enqueue(() => {
        rendered = true;
    });
    queue.clear();
    const ready = queue.processFrame();
    assert.equal(rendered, false);
    assert.equal(ready, false);
});

test('seeded placement remains reproducible and keeps spawn positions inside their chunks', () => {
    const placement = new WorldPlacement({ x: 0, y: 0, minDistance: 200 });
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
