import { Player } from '../game/player';
import { Random } from '../utils/random';
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
    debugPanel = Debug.showDebugPanel;
    show3DItem = true;
    skyView = false;

    private readonly lightingManager = LightingManager.getInstance();
    private readonly playerManager = Player.getInstance();
    private readonly worldManager = WorldManager.getInstance();

    private static instance: DebugManager;
    static getInstance(): DebugManager {
        if (!this.instance) {
            this.instance = new DebugManager();
        }
        return this.instance;
    }

    private constructor() {
        document.getElementById('debug-hide-shadows')!.addEventListener('click', () => this.deleteShadows());
        document.getElementById('debug-hide-duck')!.addEventListener('click', () => this.toggleCharMesh());
        document.getElementById('debug-hide-3d')!.addEventListener('click', () => this.toggle3ditems());
        document.getElementById('debug-sky-view')!.addEventListener('click', () => this.toggleSkyview());

        if (Debug.showFps) {
            const divFps = document.getElementById('render-fps');
            App.engine.runRenderLoop(() => {
                if (App.engine.frameId % 10 === 0) {
                    if (!divFps) {
                        return;
                    }
                    divFps.innerHTML = `${App.engine.getFps().toFixed()} fps`;
                }
            });
        }

        document.getElementById('debug-panel')!.style.display = this.debugPanel ? 'block' : 'none';

        const worldInfos = document.getElementById('debug-world-infos');
        const seed = document.getElementById('debug-seed');
        const treedInfos = document.getElementById('debug-3d');

        if (seed) {
            seed.innerHTML = `seed : ${Random.seed}`;
        }

        App.engine.runRenderLoop(() => {
            if (!this.debugPanel) {
                return;
            }
            if (App.engine.frameId % 10 === 0) {
                if (worldInfos) {
                    worldInfos.innerHTML = `position : ${this.worldManager.worldX.toFixed(0)} / ${this.worldManager.worldY.toFixed(0)}`;
                }
                if (treedInfos) {
                    treedInfos.innerHTML = `3D items : assets : ${App.scene.meshes.length} - polys : ${(App.scene.getTotalVertices() / 3).toFixed(0)}`;
                }
            }
        });
    }

    toggleDebugPanel() {
        this.debugPanel = !this.debugPanel;
        document.getElementById('debug-panel')!.style.display = this.debugPanel ? 'block' : 'none';
    }

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

