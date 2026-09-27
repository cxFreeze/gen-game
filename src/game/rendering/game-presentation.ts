import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { BodyFactory } from '../gameplay/body-factory.interface';
import type { GamePhysics } from '../gameplay/game-physics.interface';
import type { WorldPresentation } from '../gameplay/world/world';
import { CharacterView } from './characters/character-view';
import { PlayerView } from './characters/player-view';
import { ProjectileView } from './projectiles/projectile-view';
import { AssetManager } from './assets/assets';
import { LightingManager } from './lighting/lighting';
import { WorldRenderer } from './world/world-renderer';

/** Creates physical bodies and presents the world; entity lifecycles belong to gameplay. */
export class GamePresentation {
    private readonly characters = new Map<string, CharacterView>();
    private readonly projectiles = new Map<string, ProjectileView>();
    private readonly getProjectileMesh = (id: string) => this.projectiles.get(id)?.mesh;

    get playerView(): PlayerView {
        const view = this.characters.get('player');
        if (!(view instanceof PlayerView)) {
            throw new Error('The player view is not initialized');
        }
        return view;
    }

    readonly bodies: BodyFactory = {
        createPlayer: (position, range) => {
            const view = new PlayerView(position, range, this.getProjectileMesh, () => this.characters.delete('player'));
            this.characters.set('player', view);
            return view.body;
        },
        createEnemy: (name, type, position) => {
            const asset = AssetManager.getEnemyAsset(type);
            const mesh = asset.mesh.createInstance(name);
            mesh.position = new Vector3(position.x, position.y, position.z);
            mesh.scaling = new Vector3(asset.scale, asset.scale, asset.scale);
            mesh.receiveShadows = true;
            mesh.checkCollisions = true;
            LightingManager.getInstance().shadowGenerator.addShadowCaster(mesh);
            mesh.computeWorldMatrix(true);
            const view = new CharacterView(mesh, this.getProjectileMesh, () => this.characters.delete(name));
            this.characters.set(name, view);
            return view.body;
        },
        createProjectile: (id, infos, owner) => {
            const character = this.characters.get(owner);
            if (!character) {
                throw new Error(`Character view not found: ${owner}`);
            }
            const view = new ProjectileView(id, infos, character.mesh, () => this.projectiles.delete(id));
            this.projectiles.set(id, view);
            return view.body;
        },
    };

    readonly physics: GamePhysics = {
        isEnemySpaceAvailable: (name, position) => {
            const view = this.characters.get(name);
            return !!view && WorldRenderer.getInstance().isSpaceAvailable(view.mesh, position.x, position.z);
        },
    };

    readonly world: WorldPresentation = {
        initialize: layout => WorldRenderer.initialize(layout),
        loadChunk: chunk => WorldRenderer.getInstance().loadChunk(chunk),
        unloadChunk: (chunk, onUnloaded, shouldUnload) => WorldRenderer.getInstance().unloadChunk(chunk, onUnloaded, shouldUnload),
    };

    dispose() {
        for (const view of this.projectiles.values()) {
            view.dispose();
        }
        for (const view of this.characters.values()) {
            view.dispose();
        }
    }
}
