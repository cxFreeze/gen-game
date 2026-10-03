import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import type { Scene } from '@babylonjs/core/scene.js';

const modelCoverDuration = 0.12;

/** Covers a character before hiding it, then lets the cloud expand and fade. */
export class CharacterDeathEffect {
    private readonly particles;
    private readonly renderObserver;
    private readonly scene;
    private elapsedTime = 0;
    private hasRenderedParticles = false;
    private hasHiddenModel = false;
    private isDisposed = false;

    constructor(private readonly mesh: AbstractMesh, private readonly onFinished: () => void) {
        this.scene = mesh.getScene();
        for (const part of [mesh, ...mesh.getChildMeshes()]) {
            part.refreshBoundingInfo({ applySkeleton: true, applyMorph: true });
            part.computeWorldMatrix(true);
        }
        const bounds = mesh.getHierarchyBoundingVectors(true, part => part.isVisible && part.isEnabled());
        const size = bounds.max.subtract(bounds.min);
        const particleSize = Math.max(0.1, Math.min(size.x, size.y, size.z)) * 0.9;
        const halfExtents = new Vector3(
            Math.max(0, (size.x - particleSize) / 2),
            Math.max(0, (size.y - particleSize) / 2),
            Math.max(0, (size.z - particleSize) / 2),
        );
        const particles = new ParticleSystem(`${mesh.name}-death-cloud`, 480, this.scene);
        this.particles = particles;
        particles.particleTexture = this.createCloudTexture(this.scene);
        particles.emitter = bounds.min.add(bounds.max).scale(0.5);
        particles.minEmitBox = halfExtents.scale(-1);
        particles.maxEmitBox = halfExtents;
        particles.startPositionFunction = (worldMatrix, position) => {
            Vector3.TransformCoordinatesFromFloatsToRef(
                (Math.random() * 2 - 1) * halfExtents.x,
                (Math.random() * 2 - 1) * halfExtents.y,
                (Math.random() * 2 - 1) * halfExtents.z,
                worldMatrix,
                position,
            );
            const camera = this.scene.activeCamera;
            if (!camera) {
                return;
            }
            // Move along the view ray so opaque geometry cannot hide the covering particles.
            const direction = camera.globalPosition.subtract(position).normalize();
            const distance = Math.min(
                direction.x === 0 ? Infinity : ((direction.x > 0 ? bounds.max.x : bounds.min.x) - position.x) / direction.x,
                direction.y === 0 ? Infinity : ((direction.y > 0 ? bounds.max.y : bounds.min.y) - position.y) / direction.y,
                direction.z === 0 ? Infinity : ((direction.z > 0 ? bounds.max.z : bounds.min.z) - position.z) / direction.z,
            );
            if (Number.isFinite(distance)) {
                position.addInPlace(direction.scale(Math.max(0, distance) + particleSize * 0.02));
            }
        };
        particles.minSize = particleSize * 0.75;
        particles.maxSize = particleSize;
        particles.minLifeTime = 0.9;
        particles.maxLifeTime = 1.3;
        particles.manualEmitCount = particles.getCapacity();
        particles.emitRate = 0;
        particles.updateSpeed = 1 / 60;
        particles.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        particles.renderingGroupId = mesh.renderingGroupId;
        particles.direction1 = new Vector3(-size.x * 0.08, size.y * 0.06, -size.z * 0.08);
        particles.direction2 = new Vector3(size.x * 0.08, size.y * 0.16, size.z * 0.08);
        particles.minEmitPower = 0.5;
        particles.maxEmitPower = 1;
        particles.minAngularSpeed = -0.6;
        particles.maxAngularSpeed = 0.6;
        const lightColor = new Color4(0.86, 0.82, 0.94, 1);
        const shadowColor = new Color4(0.56, 0.51, 0.68, 1);
        particles.addColorGradient(0, lightColor, shadowColor);
        particles.addColorGradient(0.25, lightColor, shadowColor);
        particles.addColorGradient(1, new Color4(lightColor.r, lightColor.g, lightColor.b, 0));
        particles.addSizeGradient(0, particles.minSize, particles.maxSize);
        particles.addSizeGradient(0.2, particles.minSize, particles.maxSize);
        particles.addSizeGradient(1, particles.minSize * 1.8, particles.maxSize * 1.8);
        particles.addVelocityGradient(0, 0);
        particles.addVelocityGradient(0.2, 0);
        particles.addVelocityGradient(0.4, 1);
        particles.addVelocityGradient(1, 1);
        particles.onBeforeDrawParticlesObservable.add(() => this.hasRenderedParticles = true);
        this.renderObserver = this.scene.onAfterRenderObservable.add(() => this.update());
        particles.start();
    }

    private update() {
        if (this.hasRenderedParticles) {
            this.elapsedTime += this.scene.getAnimationRatio() / 60;
            this.hasRenderedParticles = false;
        }
        // Wait for the cloud to be drawn over the still-visible model, including shader startup.
        if (!this.hasHiddenModel && this.elapsedTime >= modelCoverDuration) {
            this.mesh.setEnabled(false);
            this.hasHiddenModel = true;
        }
        if (this.hasHiddenModel && this.particles.getActiveCount() === 0) {
            this.onFinished();
        }
    }

    dispose() {
        if (this.isDisposed) {
            return;
        }
        this.isDisposed = true;
        this.scene.onAfterRenderObservable.remove(this.renderObserver);
        this.particles.dispose();
    }

    private createCloudTexture(scene: Scene) {
        const resolution = 64;
        const pixels = new Uint8Array(resolution * resolution * 4);
        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                const radius = Math.hypot((x + 0.5) * 2 / resolution - 1, (y + 0.5) * 2 / resolution - 1);
                const opacity = 1 - Math.min(1, Math.max(0, (radius - 0.55) / 0.45));
                const offset = (y * resolution + x) * 4;
                pixels[offset] = 255;
                pixels[offset + 1] = 255;
                pixels[offset + 2] = 255;
                pixels[offset + 3] = Math.round(255 * opacity * opacity * (3 - 2 * opacity));
            }
        }
        return RawTexture.CreateRGBATexture(pixels, resolution, resolution, scene);
    }
}
