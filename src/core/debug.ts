import { LightingManager } from '../world/lighting';
import { PlayerManager } from '../world/player';
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
    private readonly playerManager = PlayerManager.getInstance();
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
            const divFps = document.getElementById('render-fps') as HTMLElement;
            App.engine.runRenderLoop(() => {
                if (App.engine.frameId % 10 === 0) {
                    divFps.innerHTML = `${App.engine.getFps().toFixed()} fps`;
                }
            });
        }

        document.getElementById('debug-panel')!.style.display = this.debugPanel ? 'block' : 'none';

        const worldInfos = document.getElementById('debug-world-infos') as HTMLElement;
        App.engine.runRenderLoop(() => {
            if (!this.debugPanel) {
                return;
            }
            if (App.engine.frameId % 10 === 0) {
                worldInfos.innerHTML = `position : ${this.worldManager.worldX.toFixed(0)} / ${this.worldManager.worldY.toFixed(0)}`;
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
        this.playerManager.playerMesh.isVisible = !this.playerManager.playerMesh.isVisible;
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
        this.skyView = !this.skyView;
        this.worldManager.setCameraHeight(this.skyView ? 2000 : 220);
    }

}

