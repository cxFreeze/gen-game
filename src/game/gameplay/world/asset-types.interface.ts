export type BiomeAssetType = 'ground' | 'tree' | 'rock' | 'grass';
export type Biome3DAssetType = Exclude<BiomeAssetType, 'grass'>;
export type ZoneAssetType = 'ground' | 'plazaGround' | 'house' | 'center' | 'tower';
export type WorldAsset = 'player' | 'fence' | 'ocean';
export type EnemyAsset = 'blob' | 'goblin' | 'skeleton' | 'troll';
