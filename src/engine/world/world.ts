import { Animation } from '@babylonjs/core/Animations/animation.js';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera.js';
import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh.js';
import { FxaaPostProcess } from '@babylonjs/core/PostProcesses/fxaaPostProcess.js';
import { takeUntil } from 'rxjs';
import { GameRuntime } from '../runtime/game-runtime';
import { Player } from '../player/player';
import { Anim } from '../utils/anim';
import { LightingManager } from './lighting';
import { WorldGenerator } from './world-generator';

export class WorldManager {

    worldX: number = 0;
    worldY: number = 0;

    private _camera: UniversalCamera | null = null;
    private get camera(): UniversalCamera {
        if (!this._camera) {
            throw new Error('World must be generated before accessing the camera');
        }
        return this._camera;
    }
    private readonly cameraX: number = 0;
    private cameraY: number = 250;
    private readonly cameraZ: number = -170;

    private readonly initCameraY: number = 40;
    private readonly initCameraZ: number = 25;

    private readonly transparentMeshes = new Set<AbstractMesh>();
    private readonly ghostMeshes = new WeakMap<InstancedMesh, AbstractMesh>();

    private readonly lightingManager = LightingManager.getInstance();
    private readonly worldGenerator = WorldGenerator.getInstance();
    private readonly player = Player.getInstance();

    private static instance: WorldManager | undefined;
    static dispose() {
        this.instance = undefined;
    }
    static getInstance(): WorldManager {
        if (!this.instance) {
            this.instance = new WorldManager();
        }
        return this.instance;
    }

    private constructor() {
        GameRuntime.scene.onBeforeRenderObservable.add((scene) => {
            if (scene.getFrameId() % 10 === 0) {
                this.setCameraObstacleSemiTransparent();
            }
        });
    }

    generateWorld() {
        this._camera = new UniversalCamera('camera', new Vector3(0, 0, 0), GameRuntime.scene);
        new FxaaPostProcess('fxaa', 1.0, this.camera);

        this.setCameraPosition(this.player.position.x, this.player.position.z);

        const finalCameraPos = new Vector3(this.player.position.x + this.cameraX, this.cameraY, this.player.position.z + this.cameraZ);

        this.camera.position = new Vector3(this.player.position.x, this.initCameraY, this.player.position.z + this.initCameraZ);
        const initRot = this.camera.rotation?.clone() ?? Vector3.Zero();
        this.camera.rotation = initRot.clone().addInPlace(new Vector3(0, Math.PI, 0));

        GameRuntime.hideLoadingScreen$.pipe(takeUntil(GameRuntime.disposed$)).subscribe(() => {
            const posAnim = Animation.CreateAndStartAnimation('initCamera1', this.camera, 'position', 30, 120, this.camera.position, finalCameraPos, 2, Anim.cubicEaseInOut);
            const rotAnim = Animation.CreateAndStartAnimation('initCamera2', this.camera, 'rotation', 30, 120, this.camera.rotation, initRot, 2, Anim.cubicEaseInOut);
            this.player.playerMoved$.pipe(takeUntil(GameRuntime.disposed$)).subscribe((moved) => {
                if (moved) {
                    posAnim?.stop();
                    rotAnim?.stop();
                }
            });
        });
    }

    setCameraPosition(x: number, y: number) {
        this.worldX = x;
        this.worldY = y;

        this.camera.position = new Vector3(x + this.cameraX, this.cameraY, y + this.cameraZ);
        this.camera.setTarget(this.player.mesh.position);

        this.lightingManager.setSunPosition(x, y);
        this.worldGenerator.generateWorld(x, y);
    }

    private setCameraObstacleSemiTransparent() {
        const ray = new Ray(this.camera.position, this.player.mesh.position.subtract(this.camera.position).normalize());

        const hitResults = GameRuntime.scene.multiPickWithRay(ray, (mesh) => {
            return mesh.name !== 'player' && mesh.isPickable;
        });

        const currentMeshes = new Set<AbstractMesh>();
        if (hitResults) {
            for (const hit of hitResults) {
                if (!hit.pickedPoint || hit.pickedPoint.y < 20 || !hit.pickedMesh) {
                    continue;
                }
                const mesh = hit.pickedMesh;
                currentMeshes.add(mesh);

                if (!this.transparentMeshes.has(mesh)) {
                    const newMesh = this.setMeshTransparent(mesh);
                    this.transparentMeshes.add(mesh);
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
        if (!mesh.material || !(mesh instanceof InstancedMesh) || this.ghostMeshes.has(mesh)) {
            return undefined;
        }

        const ghostMesh = mesh.sourceMesh.clone(`ghost${mesh.name}`);
        ghostMesh.position = mesh.position;
        ghostMesh.rotation = mesh.rotation;
        ghostMesh.scaling = mesh.scaling;
        ghostMesh.material = mesh.material.clone('ghostMaterial');
        if (ghostMesh.material == null) {
            return;
        }
        ghostMesh.material.transparencyMode = 2;
        ghostMesh.material.alpha = 0.2;
        ghostMesh.receiveShadows = true;
        ghostMesh.isVisible = true;

        GameRuntime.scene.addMesh(ghostMesh);
        this.lightingManager.shadowGenerator.addShadowCaster(ghostMesh);
        this.ghostMeshes.set(mesh, ghostMesh);

        GameRuntime.schedule(() => {
            mesh.isVisible = false;
        }, 50);

        return ghostMesh;
    }


    private resetMeshTransparency(mesh: AbstractMesh): void {
        mesh.isVisible = true;

        if (!(mesh instanceof InstancedMesh)) {
            return;
        }

        const ghostMesh = this.ghostMeshes.get(mesh);
        if (!ghostMesh) {
            return;
        }

        GameRuntime.scene.removeMesh(ghostMesh);
        ghostMesh.dispose();
        this.ghostMeshes.delete(mesh);
    }


    public setCameraHeight(y: number) {
        this.cameraY = y;
        this.camera.position.y = y;
        this.camera.setTarget(this.player.mesh.position);
    }
}
