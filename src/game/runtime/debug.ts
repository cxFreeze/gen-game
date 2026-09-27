import type { PlayerView } from '../rendering/characters/player-view';
import { LightingManager } from '../rendering/lighting/lighting';
import type { WorldView } from '../rendering/camera/world-view';
import { GameRuntime } from './game-runtime';

export class DebugManager {
    show3DItem = true;
    skyView = false;

    private get lightingManager() {
        return LightingManager.getInstance();
    }

    constructor(
        private readonly player: PlayerView,
        private readonly worldView: WorldView,
    ) { }

    deleteShadows() {
        GameRuntime.scene.meshes.forEach(mesh => {
            this.lightingManager.shadowGenerator.removeShadowCaster(mesh);
        });
    }

    toggleCharMesh() {
        this.player.mesh.isVisible = !this.player.mesh.isVisible;
        return this.player.mesh.isVisible;
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
        this.worldView.setCameraHeight(this.skyView ? 2000 : 220);
        return this.skyView;
    }

}

