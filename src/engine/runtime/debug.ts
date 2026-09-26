import { Player } from '../player/player';
import { LightingManager } from '../world/lighting';
import { WorldManager } from '../world/world';
import { GameRuntime } from './game-runtime';

export class DebugManager {
    show3DItem = true;
    skyView = false;

    private get lightingManager() {
        return LightingManager.getInstance();
    }

    private get playerManager() {
        return Player.getInstance();
    }

    private get worldManager() {
        return WorldManager.getInstance();
    }

    private static instance: DebugManager | undefined;
    static dispose() {
        this.instance = undefined;
    }
    static getInstance(): DebugManager {
        if (!this.instance) {
            this.instance = new DebugManager();
        }
        return this.instance;
    }

    private constructor() { }

    deleteShadows() {
        GameRuntime.scene.meshes.forEach(mesh => {
            this.lightingManager.shadowGenerator.removeShadowCaster(mesh);
        });
    }

    toggleCharMesh() {
        this.playerManager.mesh.isVisible = !this.playerManager.mesh.isVisible;
        return this.playerManager.mesh.isVisible;
    }

    toggle3ditems() {
        this.show3DItem = !this.show3DItem;
        GameRuntime.scene.meshes.forEach(mesh => {
            if (mesh.name !== 'player' && mesh.name !== 'ground') {
                mesh.isVisible = this.show3DItem;
            }
        });
        return this.show3DItem;
    }

    toggleSkyview() {
        GameRuntime.engine.clear(GameRuntime.scene.clearColor, true, true);
        this.skyView = !this.skyView;
        this.worldManager.setCameraHeight(this.skyView ? 2000 : 220);
        return this.skyView;
    }

}

