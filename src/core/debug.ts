import { Player } from '../game/player';
import { LightingManager } from '../world/lighting';
import { WorldManager } from '../world/world';
import { App } from './app';

export class Debug {
    static showInspector = false;
    static showFps = true;
    static showPlayerCollider = false;
    static showDebugPanel = false;
}

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
        App.scene.meshes.forEach(mesh => {
            this.lightingManager.shadowGenerator.removeShadowCaster(mesh);
        });
    }

    toggleCharMesh() {
        this.playerManager.mesh.isVisible = !this.playerManager.mesh.isVisible;
    }

    toggle3ditems() {
        this.show3DItem = !this.show3DItem;
        App.scene.meshes.forEach(mesh => {
            if (mesh.name !== 'player' && mesh.name !== 'ground') {
                mesh.isVisible = this.show3DItem;
            }
        });
    }

    toggleSkyview() {
        App.engine.clear(App.scene.clearColor, true, true);
        this.skyView = !this.skyView;
        this.worldManager.setCameraHeight(this.skyView ? 2000 : 220);
    }

}

