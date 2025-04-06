import { EnemyType } from '../models/interfaces';

export class EnemyTypes {

    static readonly blob: EnemyType = {
        name: 'blob',
        stats: {
            health: 50,
            damage: 5,
            speed: 1,
            fireRate: 0.3,
            projectileSpeed: 6,
            range: 300
        }
    };

    static readonly goblin: EnemyType = {
        name: 'goblin',
        stats: {
            health: 100,
            damage: 10,
            speed: 1.5,
            fireRate: 0.5,
            projectileSpeed: 8,
            range: 300
        }
    };

    static readonly skeleton: EnemyType = {
        name: 'skeleton',
        stats: {
            health: 150,
            damage: 15,
            speed: 2,
            fireRate: 0.7,
            projectileSpeed: 10,
            range: 300
        }
    };

    static readonly troll: EnemyType = {
        name: 'troll',
        stats: {
            health: 200,
            damage: 20,
            speed: 2.5,
            fireRate: 0.9,
            projectileSpeed: 12,
            range: 300
        }
    };
}