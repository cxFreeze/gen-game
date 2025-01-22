import { Biome, BiomeType, Zone, ZoneType } from '../models/interfaces';

export class Biomes {

    static biomes: { [key in BiomeType]: Biome } = {
        [BiomeType.forest]: {
            ground: 'ground',
            items: [
                {
                    asset: 'tree',
                    drawCount: 40,
                    boostDrawCount: 150,
                    boostDrawCountRate: 0.2
                },
                {
                    asset: 'rock',
                    drawCount: 8,
                },
                {
                    asset: 'grass',
                    drawCount: 280
                }
            ]
        }
    };

    static zones: { [key in ZoneType]: Zone } = {
        [ZoneType.town]: {
            ground: 'ground',
            items: [
                {
                    asset: 'house',
                    drawCount: 60,
                }
            ]
        }
    };

}