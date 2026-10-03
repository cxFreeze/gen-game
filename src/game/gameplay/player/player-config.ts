import type { CharacterStats } from '../characters/character-stats.interface';

export const playerConfig = {
    moveSpeed: 85,
    stats: {
        health: 40,
        damage: 10,
        speed: 1,
        fireRate: 2,
        projectileSpeed: 10,
        range: 250,
    } satisfies CharacterStats,
};
