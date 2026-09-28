import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { AssetContainer } from '@babylonjs/core/assetContainer.js';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';
import type { Scene } from '@babylonjs/core/scene.js';

/** Presents the player model without creating a gameplay session. */
export class MenuView {
    private readonly camera;
    private container: AssetContainer | undefined;
    private modelRadius = 1;
    private readonly modelCorners: Vector3[] = [];

    constructor(private readonly scene: Scene) {
        scene.clearColor = new Color4(0, 0, 0, 0);
        this.camera = new ArcRotateCamera('menu-camera', Math.PI / 2 - 0.3, Math.PI / 2 - 0.15, 4, Vector3.Zero(), scene);
        this.camera.minZ = 0.01;

        const ambient = new HemisphericLight('menu-ambient', Vector3.Up(), scene);
        ambient.intensity = 0.8;
        ambient.groundColor = new Color3(0.2, 0.18, 0.13);
        const key = new DirectionalLight('menu-key', new Vector3(-1, -2, -2), scene);
        key.intensity = 1.2;
        key.diffuse = new Color3(1, 0.86, 0.65);
    }

    async load(signal: AbortSignal) {
        signal.throwIfAborted();
        const container = await LoadAssetContainerAsync('./3d/player.glb', this.scene);
        if (signal.aborted) {
            container.dispose();
            signal.throwIfAborted();
        }
        this.container = container;
        container.addAllToScene();

        const model = new TransformNode('menu-player', this.scene);
        for (const node of container.rootNodes) {
            node.parent = model;
        }
        for (const animation of container.animationGroups) {
            animation.stop();
        }
        const idle = container.animationGroups.find(animation => animation.name === 'Idle');
        if (!idle) {
            throw new Error('The player model has no Idle animation');
        }
        idle.start(true);
        this.frameAnimatedModel(model, container, idle);
    }

    private frameAnimatedModel(model: TransformNode, container: AssetContainer, animation: AnimationGroup) {
        let min = new Vector3(Infinity, Infinity, Infinity);
        let max = new Vector3(-Infinity, -Infinity, -Infinity);
        const sampleCount = 24;

        // Include the skinned geometry throughout Idle, rather than the unposed mesh bounds.
        for (let sample = 0; sample <= sampleCount; sample++) {
            animation.goToFrame(animation.from + (animation.to - animation.from) * sample / sampleCount);
            this.refreshModelBounds(container);
            const bounds = model.getHierarchyBoundingVectors();
            min = Vector3.Minimize(min, bounds.min);
            max = Vector3.Maximize(max, bounds.max);
        }
        animation.goToFrame(animation.from);
        this.refreshModelBounds(container);

        const center = min.add(max).scale(0.5);
        this.camera.setTarget(center);
        this.modelCorners.length = 0;
        for (const x of [min.x, max.x]) {
            for (const y of [min.y, max.y]) {
                for (const z of [min.z, max.z]) {
                    this.modelCorners.push(new Vector3(x, y, z).subtract(center));
                }
            }
        }
        this.modelRadius = Math.max(Vector3.Distance(min, max) / 2, 0.1);
        this.resize();
    }

    private refreshModelBounds(container: AssetContainer) {
        for (const skeleton of container.skeletons) {
            skeleton.prepare(true);
        }
        for (const mesh of container.meshes) {
            if (mesh.getTotalVertices() > 0) {
                mesh.refreshBoundingInfo({ applySkeleton: true, applyMorph: true });
            }
        }
    }

    resize() {
        const aspectRatio = this.scene.getEngine().getAspectRatio(this.camera);
        const halfVerticalFov = this.camera.fov / 2;
        const halfHorizontalFov = Math.atan(Math.tan(halfVerticalFov) * aspectRatio);
        this.camera.radius = this.modelRadius / Math.sin(Math.min(halfVerticalFov, halfHorizontalFov)) * 0.918;
        const viewMatrix = this.camera.getViewMatrix(true);
        const frameMargin = 0.94;
        for (const corner of this.modelCorners) {
            const offset = Vector3.TransformNormal(corner, viewMatrix);
            const requiredDistance = Math.max(
                Math.abs(offset.x) / (Math.tan(halfHorizontalFov) * frameMargin),
                Math.abs(offset.y) / (Math.tan(halfVerticalFov) * frameMargin),
            ) + offset.z;
            this.camera.radius = Math.max(this.camera.radius, requiredDistance);
        }
        this.camera.maxZ = Math.max(this.camera.radius * 20, 100);
    }

    dispose() {
        this.container?.dispose();
        this.container = undefined;
    }
}
