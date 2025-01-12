import { AbstractMesh, Animation, InstancedMesh, Ray, UniversalCamera, Vector3 } from '@babylonjs/core';
import { timer } from 'rxjs';
import { App } from '../app.js';
import { Anim } from '../utils/anim.js';
import { LightingManager } from './lighting.js';
import { PlayerManager } from './player.js';
import { WorldGenerator } from './world-generator.js';

export class WorldManager {

    worldX: number = 0;
    worldY: number = 0;

    private camera: UniversalCamera;
    private readonly cameraX: number = 0;
    private cameraY: number = 250;
    private readonly cameraZ: number = -170;

    private readonly initCameraY: number = 40;
    private readonly initCameraZ: number = 25;

    private readonly transparentMeshes = new Set<AbstractMesh>();

    private readonly lightingManager = LightingManager.getInstance();
    private readonly worldGenerator = WorldGenerator.getInstance();
    private readonly playerManager = PlayerManager.getInstance();

    private static instance: WorldManager;
    static getInstance(): WorldManager {
        if (!this.instance) {
            this.instance = new WorldManager();
        }
        return this.instance;
    }

    private constructor() {
        App.scene.onBeforeRenderObservable.add((scene) => {
            if (scene.getFrameId() % 10 === 0) {
                this.setCameraObstacleSemiTransparent();
            }
        });
    }

    generateWorld() {
        this.camera = new UniversalCamera('camera', new Vector3(0, 0, 0), App.scene);

        this.setCameraPosition(this.playerManager.playerX, this.playerManager.playerY);

        const finalCameraPos = new Vector3(this.playerManager.playerX + this.cameraX, this.cameraY, this.playerManager.playerY + this.cameraZ);

        this.camera.position = new Vector3(this.playerManager.playerX, this.initCameraY, this.playerManager.playerY + this.initCameraZ);
        const initRot = this.camera.rotation!.clone();
        this.camera.rotation = initRot.clone().addInPlace(new Vector3(0, Math.PI, 0));

        timer(2000).subscribe(() => {
            const posAnim = Animation.CreateAndStartAnimation('initCamera1', this.camera, 'position', 30, 120, this.camera.position, finalCameraPos, 0, Anim.cubicEaseInOut);
            const rotAnim = Animation.CreateAndStartAnimation('initCamera2', this.camera, 'rotation', 30, 120, this.camera.rotation, initRot, 0, Anim.cubicEaseInOut);
            this.playerManager.playerMoved$.subscribe((moved) => {
                if (moved) {
                    posAnim!.stop();
                    rotAnim!.stop();
                }
            });
        });
    }

    setCameraPosition(x: number, y: number) {
        this.worldX = x;
        this.worldY = y;

        this.camera.position = new Vector3(x + this.cameraX, this.cameraY, y + this.cameraZ);
        this.camera.setTarget(this.playerManager.playerMesh.position);

        this.lightingManager.setSunPosition(x, y);
        this.worldGenerator.generateWorld(x, y);
    }

    private setCameraObstacleSemiTransparent() {
        const ray = new Ray(this.camera.position, this.playerManager.playerMesh.position.subtract(this.camera.position).normalize());

        const hitResults = App.scene.multiPickWithRay(ray, (mesh) => mesh.name !== 'player');

        const currentMeshes = new Set();
        if (hitResults) {
            for (const hit of hitResults) {
                if (!hit.pickedPoint || hit.pickedPoint.y < 20) {
                    continue;
                }
                const mesh = hit.pickedMesh;
                currentMeshes.add(mesh);

                if (!this.transparentMeshes.has(mesh!)) {
                    const newMesh = this.setMeshTransparent(mesh!);
                    this.transparentMeshes.add(mesh!);
                    if (newMesh) {
                        this.lightingManager.shadowGenerator.addShadowCaster(newMesh);
                    }
                }
            }
        }

        for (const mesh of this.transparentMeshes) {
            if (!currentMeshes.has(mesh)) {
                this.resetMeshTransparency(mesh);
                this.transparentMeshes.delete(mesh);
            }
        }
    }

    private setMeshTransparent(mesh: AbstractMesh): AbstractMesh | undefined {
        if (!mesh || !mesh.material || !(mesh instanceof InstancedMesh) || (mesh as any)._ghostMesh) {
            return undefined;
        }

        const ghostMesh = mesh.sourceMesh.clone(`ghost${mesh.name}`);
        ghostMesh.position = mesh.position;
        ghostMesh.rotation = mesh.rotation;
        ghostMesh.scaling = mesh.scaling;
        ghostMesh.visibility = 0.2;
        ghostMesh.receiveShadows = true;

        App.scene.addMesh(ghostMesh);
        mesh.isVisible = false;

        (mesh as any)._ghostMesh = ghostMesh;

        return ghostMesh;
    }


    private resetMeshTransparency(mesh: AbstractMesh): void {
        mesh.isVisible = true;

        if (!(mesh instanceof InstancedMesh) || !(mesh as any)._ghostMesh) {
            return;
        }

        App.scene.removeMesh((mesh as any)._ghostMesh);
        (mesh as any)._ghostMesh.dispose();
        (mesh as any)._ghostMesh = null;
    }


    public setCameraHeight(y: number) {
        this.cameraY = y;
        this.camera.position.y = y;
        this.camera.setTarget(this.playerManager.playerMesh.position);
    }
}