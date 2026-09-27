import { WorldPlacement } from './world-placement';
import { worldConfig } from './world-config';
import { isInWorldBounds } from './world-bounds';
import { BiomeType, ZoneType, type BiomeItem, type ZoneItem } from './world-types';
import { Biomes } from './biomes';
import { Random } from '../../math/random';

export type ItemLoadRequest = {
    kind: 'biome';
    item: BiomeItem;
    noSprite: boolean;
} | {
    kind: 'zone';
    item: ZoneItem;
    zone: ZoneType;
};

export class WorldLayout extends WorldPlacement {
    readonly biome = BiomeType.forest;
    readonly ground = Biomes.biomes[BiomeType.forest].ground;
    private readonly zones = new Map<string, ZoneType>();
    private readonly spawn: { playerInitX: number; playerInitY: number };

    constructor(spawn: { playerInitX: number; playerInitY: number }) {
        super({
            randomNumber: seed => Random.randomNumber(seed),
            randomBool: (seed, probability) => Random.randomBool(seed, probability),
            ...worldConfig,
            worldSize: worldConfig.safeDrawWorldSize,
            playerSpawn: { x: spawn.playerInitX, y: spawn.playerInitY, minDistance: worldConfig.spawnMinDistanceFromPlayerSpawn },
        });
        this.spawn = { ...spawn };
        for (let index = 0; index < worldConfig.zoneCount[ZoneType.town]; index++) {
            this.zones.set(this.getZoneRandomChunk(ZoneType.town, index), ZoneType.town);
        }
    }

    getItemsForChunk(x: number, y: number): ItemLoadRequest[] {
        const zone = this.zones.get(this.getChunk(x, y));
        const biomeItems: ItemLoadRequest[] = Biomes.biomes[BiomeType.forest].items.map(item => ({ kind: 'biome', item, noSprite: !!zone }));
        const zoneItems: ItemLoadRequest[] = zone ? Biomes.zones[zone].items.map(item => ({ kind: 'zone', item, zone })) : [];
        return [...zoneItems, ...biomeItems];
    }

    getDrawCount(request: ItemLoadRequest, x: number, y: number) {
        const item = request.item;
        if (request.kind === 'biome' && request.item.boostDrawCount && request.item.boostDrawCountRate
            && this.randBoolItem(request.item.boostDrawCountRate, item.asset + this.getBiomeChunk(x, y), 0, 0)) {
            return request.item.boostDrawCount;
        }
        return item.drawCount;
    }

    getDrawRate(drawCount: number, safeZone: number) {
        return drawCount * safeZone ** 2 / 1000000;
    }

    getZoneForChunk(chunk: string) {
        return this.zones.get(chunk) ?? null;
    }

    isInWorldBounds(x: number, y: number) {
        return isInWorldBounds(x, y, worldConfig.safeDrawWorldSize);
    }

    isInSpawnClearance(x: number, y: number) {
        return Math.abs(x - this.spawn.playerInitX) < worldConfig.spawnNoDrawZone
            && Math.abs(y - this.spawn.playerInitY) < worldConfig.spawnNoDrawZone;
    }
}
