import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameView } from '../gameplay/game-view.interface';
import type { EnemyAsset } from '../gameplay/world/asset-types.interface';
import type { WorldLayout } from '../gameplay/world/world-layout';
import type { ProjectileInfos } from '../gameplay/projectiles/projectile-trajectory';
import type { Position } from '../math/position';
import { CharacterView } from './characters/character-view';
import { PlayerView } from './characters/player-view';
import { ProjectileView } from './projectiles/projectile-view';
import { AssetManager } from './assets/assets';
import { LightingManager } from './lighting/lighting';
import { WorldRenderer } from './world/world-renderer';

/** Creates physical bodies and presents the world; entity lifecycles belong to gameplay. */
export class GamePresentation implements GameView {
    private readonly characters = new Map<string, CharacterView>();
    private readonly projectiles = new Map<string, ProjectileView>();

    get playerView(): PlayerView {
        const view = this.characters.get('player');
        if (!(view instanceof PlayerView)) {
            throw new Error('The player view is not initialized');
        }
        return view;
    }

    createPlayer(position: Position, range: number): PlayerView {
        const view = new PlayerView(position, range, this);
        this.characters.set('player', view);
        return view;
    }

    createEnemy(name: string, type: EnemyAsset, position: Position): CharacterView {
        const asset = AssetManager.getEnemyAsset(type);
        const mesh = asset.mesh.createInstance(name);
        mesh.position = new Vector3(position.x, position.y, position.z);
        mesh.scaling = new Vector3(asset.scale, asset.scale, asset.scale);
        mesh.receiveShadows = true;
        mesh.checkCollisions = true;
        LightingManager.getInstance().shadowGenerator.addShadowCaster(mesh);
        mesh.computeWorldMatrix(true);
        const view = new CharacterView(mesh, this);
        this.characters.set(name, view);
        return view;
    }

    createProjectile(id: string, infos: ProjectileInfos, owner: string): ProjectileView {
        const character = this.characters.get(owner);
        if (!character) {
            throw new Error(`Character view not found: ${owner}`);
        }
        const view = new ProjectileView(id, infos, character.mesh, this);
        this.projectiles.set(id, view);
        return view;
    }

    getProjectileMesh(id: string) {
        return this.projectiles.get(id)?.mesh;
    }

    removeCharacter(name: string) {
        this.characters.delete(name);
    }

    removeProjectile(id: string) {
        this.projectiles.delete(id);
    }

    isEnemySpaceAvailable(name: string, position: Position): boolean {
        const view = this.characters.get(name);
        return !!view && WorldRenderer.getInstance().isSpaceAvailable(view.mesh, position.x, position.z);
    }

    initializeWorld(layout: WorldLayout) {
        WorldRenderer.initialize(layout);
    }

    loadChunk(chunk: string) {
        WorldRenderer.getInstance().loadChunk(chunk);
    }

    unloadChunk(chunk: string, onUnloaded: () => void, shouldUnload: () => boolean) {
        WorldRenderer.getInstance().unloadChunk(chunk, onUnloaded, shouldUnload);
    }

    dispose() {
        for (const view of this.projectiles.values()) {
            view.dispose();
        }
        for (const view of this.characters.values()) {
            view.dispose();
        }
    }
}
