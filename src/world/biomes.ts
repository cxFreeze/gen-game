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
                    drawCount: 10,
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
                    asset: 'ground',
                    drawCount: 1,
                    chunkPlacement: { x: 0, y: -250, z: 250 }
                },
                {
                    asset: 'plazaGround',
                    drawCount: 1,
                    chunkPlacement: { x: 0, y: -60, z: 60.01 }
                },
                {
                    asset: 'center',
                    drawCount: 1,
                    chunkPlacement: { x: 0, y: 0, z: 0 }
                },
                {
                    asset: 'house',
                    drawCount: 250,
                }
            ]
        }
    };

}