import assert from 'node:assert/strict';
import test from 'node:test';
import { ESLint } from 'eslint';

test('rendering may use gameplay interfaces but cannot import entity implementations', async () => {
    const eslint = new ESLint();
    const [forbidden] = await eslint.lintText('import { Character } from \'../../gameplay/characters/character\'; export const create = Character;', {
        filePath: 'src/game/rendering/characters/boundary-check.ts',
    });
    assert.ok(forbidden.messages.some(message => message.ruleId === 'no-restricted-imports'));
    const [allowed] = await eslint.lintText('import type { CharacterBody } from \'../../gameplay/characters/character-body.interface\'; export type Body = CharacterBody;', {
        filePath: 'src/game/rendering/characters/boundary-check.ts',
    });
    assert.equal(allowed.errorCount, 0);
});

test('runtime accesses the gameplay session rather than individual managers', async () => {
    const eslint = new ESLint();
    const [forbidden] = await eslint.lintText('import { EnemySystem } from \'../gameplay/enemies/enemy-system\'; export const create = EnemySystem;', {
        filePath: 'src/game/runtime/boundary-check.ts',
    });
    assert.ok(forbidden.messages.some(message => message.ruleId === 'no-restricted-imports'));
    const [allowed] = await eslint.lintText('import { Game } from \'../gameplay/game\'; export const create = Game;', {
        filePath: 'src/game/runtime/boundary-check.ts',
    });
    assert.equal(allowed.errorCount, 0);
});
