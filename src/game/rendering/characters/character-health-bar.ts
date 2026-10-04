import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';

const visibleDuration = 10;
const healthDuration = 0.16;
const damageDelay = 0.12;
const damageDuration = 0.35;
const barWidth = 70;
const barHeight = 8;
const fillWidth = barWidth - 2;

/** A camera-facing bar with a delayed damage trail, created only after an impact. */
export class CharacterHealthBar {
    private readonly scene;
    private readonly background;
    private readonly damageFill;
    private readonly healthFill;
    private readonly renderObserver;
    private elapsedTime = 0;
    private targetRatio = 1;
    private initialHealthRatio = 1;
    private initialDamageRatio = 1;
    private isVisible = false;
    private isDisposed = false;

    constructor(private readonly characterMesh: AbstractMesh, private readonly onFinished: () => void) {
        this.scene = characterMesh.getScene();
        this.background = this.createPart('background', barWidth, barHeight, new Color3(0.08, 0.09, 0.1), 0);
        this.background.billboardMode = Mesh.BILLBOARDMODE_ALL;
        this.damageFill = this.createPart('damage', fillWidth, barHeight - 2, new Color3(0.70, 0.80, 0.80), 1);
        this.healthFill = this.createPart('health', fillWidth, barHeight - 2, new Color3(0.80, 0.35, 0.35), 2);
        this.damageFill.parent = this.background;
        this.healthFill.parent = this.background;
        this.background.setEnabled(false);
        this.renderObserver = this.scene.onBeforeRenderObservable.add(() => this.update());
    }

    show(previousHealth: number, currentHealth: number, maxHealth: number) {
        if (this.isDisposed) {
            return;
        }
        const previousRatio = Math.max(0, Math.min(1, previousHealth / maxHealth));
        this.initialHealthRatio = this.isVisible ? this.healthFill.scaling.x : previousRatio;
        this.initialDamageRatio = this.isVisible ? Math.max(previousRatio, this.damageFill.scaling.x) : previousRatio;
        this.targetRatio = Math.max(0, Math.min(1, currentHealth / maxHealth));
        this.elapsedTime = 0;
        this.isVisible = true;
        this.setFill(this.healthFill, this.initialHealthRatio);
        this.setFill(this.damageFill, this.initialDamageRatio);
        this.updatePosition();
    }

    private createPart(name: string, width: number, height: number, color: Color3, layer: number) {
        const mesh = CreatePlane(`${this.characterMesh.name}-health-bar-${name}`, { width, height }, this.scene);
        mesh.isPickable = false;
        mesh.renderingGroupId = this.characterMesh.renderingGroupId;
        const material = new StandardMaterial(`${mesh.name}-material`, this.scene);
        material.disableLighting = true;
        material.emissiveColor = color;
        material.backFaceCulling = false;
        // Separate coplanar layers without changing their screen position.
        material.zOffset = -layer;
        material.zOffsetUnits = -layer;
        mesh.material = material;
        return mesh;
    }

    private update() {
        if (!this.isVisible || this.isDisposed) {
            return;
        }
        this.elapsedTime += this.scene.getAnimationRatio() / 60;
        if (this.elapsedTime >= visibleDuration || this.characterMesh.isDisposed()) {
            this.dispose();
            return;
        }
        this.setFill(this.healthFill, this.getAnimatedRatio(this.initialHealthRatio, 0, healthDuration));
        this.setFill(this.damageFill, this.getAnimatedRatio(this.initialDamageRatio, damageDelay, damageDuration));
        this.updatePosition();
    }

    private getAnimatedRatio(initialRatio: number, delay: number, duration: number) {
        const progress = Math.max(0, Math.min(1, (this.elapsedTime - delay) / duration));
        const easedProgress = 1 - (1 - progress) ** 3;
        return initialRatio + (this.targetRatio - initialRatio) * easedProgress;
    }

    private setFill(mesh: Mesh, ratio: number) {
        mesh.scaling.x = ratio;
        mesh.position.x = (ratio - 1) * fillWidth / 2;
        mesh.isVisible = ratio > 0;
    }

    private updatePosition() {
        const camera = this.scene.activeCamera;
        this.background.setEnabled(!!camera && this.characterMesh.isEnabled());
        if (!camera) {
            return;
        }
        const bounds = this.characterMesh.getHierarchyBoundingVectors(true, mesh => mesh.isVisible && mesh.isEnabled());
        this.background.position.set((bounds.min.x + bounds.max.x) / 2, bounds.max.y * 1.2, (bounds.min.z + bounds.max.z) / 2);
        const engine = this.scene.getEngine();
        const viewportHeight = engine.getRenderHeight() * engine.getHardwareScalingLevel() * camera.viewport.height;
        const depth = camera.mode === Camera.PERSPECTIVE_CAMERA
            ? Math.max(camera.minZ, Math.abs(Vector3.TransformCoordinates(this.background.position, camera.getViewMatrix()).z))
            : 1;
        const worldUnitsPerPixel = 2 * depth / (viewportHeight * Math.abs(camera.getProjectionMatrix().m[5]));
        this.background.scaling.setAll(worldUnitsPerPixel);
        const screenUp = Vector3.TransformNormal(Vector3.Up(), camera.getWorldMatrix()).normalize();
        this.background.position.addInPlace(screenUp.scale((8 + barHeight / 2) * worldUnitsPerPixel));
    }

    dispose() {
        if (this.isDisposed) {
            return;
        }
        this.isDisposed = true;
        this.scene.onBeforeRenderObservable.remove(this.renderObserver);
        this.background.dispose(false, true);
        this.onFinished();
    }
}
