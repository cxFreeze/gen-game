import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import type { Scene } from '@babylonjs/core/scene.js';

/** A brief horizontal ring of coral fragments around the character on health loss. */
export class CharacterDamageEffect {
    private static readonly texturesByScene = new WeakMap<Scene, RawTexture>();
    private readonly particles;
    private readonly scene;
    private readonly renderObserver;
    private readonly movementObserver;
    private isDisposed = false;

    constructor(mesh: AbstractMesh, private readonly onFinished: () => void) {
        this.scene = mesh.getScene();
        const parts = new Set([mesh, ...mesh.getChildMeshes()]);
        for (const part of parts) {
            part.refreshBoundingInfo({ applySkeleton: true, applyMorph: true });
            part.computeWorldMatrix(true);
        }
        const bounds = mesh.getHierarchyBoundingVectors(true, part => part.isVisible && part.isEnabled());
        const size = bounds.max.subtract(bounds.min);
        const center = bounds.min.add(bounds.max).scale(0.5);
        const camera = this.scene.activeCamera;
        let fragmentSize = Math.max(0.5, Math.min(size.x, size.y, size.z) * 0.16);
        if (camera) {
            const engine = this.scene.getEngine();
            const viewportHeight = engine.getRenderHeight() * engine.getHardwareScalingLevel() * camera.viewport.height;
            const depth = camera.mode === Camera.PERSPECTIVE_CAMERA
                ? Math.max(camera.minZ, Math.abs(Vector3.TransformCoordinates(center, camera.getViewMatrix()).z))
                : 1;
            fragmentSize = 10 * 2 * depth / (viewportHeight * Math.abs(camera.getProjectionMatrix().m[5]));
        }
        // Keep a compact ring close to the body, in the ground plane at mid-height.
        const radius = Math.max(size.x, size.z) * 0.5 + fragmentSize * 0.1;
        const origin = center;
        const particles = new ParticleSystem(`${mesh.name}-damage-burst`, 12, this.scene);
        this.particles = particles;
        particles.particleTexture = this.getTexture();
        particles.emitter = origin;
        particles.minEmitBox = Vector3.Zero();
        particles.maxEmitBox = Vector3.Zero();
        let fragmentIndex = 0;
        const angleOffset = Math.random() * Math.PI * 2;
        let angle = angleOffset;
        particles.startPositionFunction = (_worldMatrix, position) => {
            angle = angleOffset + fragmentIndex++ * Math.PI * 2 / particles.getCapacity();
            position.set(origin.x + Math.cos(angle) * radius, origin.y, origin.z + Math.sin(angle) * radius);
        };
        particles.startDirectionFunction = (_worldMatrix, direction) => {
            direction.set(Math.cos(angle), 0, Math.sin(angle));
        };
        particles.manualEmitCount = particles.getCapacity();
        particles.emitRate = 0;
        particles.updateSpeed = 1 / 60;
        particles.minLifeTime = 0.25;
        particles.maxLifeTime = 0.35;
        particles.minSize = fragmentSize;
        particles.maxSize = fragmentSize;
        particles.minScaleX = 1;
        particles.maxScaleX = 1;
        particles.minScaleY = 1;
        particles.maxScaleY = 1;
        particles.minEmitPower = fragmentSize * 0.6;
        particles.maxEmitPower = fragmentSize;
        particles.minInitialRotation = 0;
        particles.maxInitialRotation = Math.PI * 2;
        particles.minAngularSpeed = -4;
        particles.maxAngularSpeed = 4;
        particles.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        particles.renderingGroupId = mesh.renderingGroupId;
        particles.addColorGradient(0, new Color4(1, 0.28, 0.14, 0.6));
        particles.addColorGradient(0.45, new Color4(1, 0.2, 0.08, 0.5));
        particles.addColorGradient(0.75, new Color4(1, 0.12, 0.05, 0.35));
        particles.addColorGradient(1, new Color4(1, 0.12, 0.05, 0));
        particles.addSizeGradient(0, fragmentSize);
        particles.addSizeGradient(0.5, fragmentSize);
        particles.addSizeGradient(1, fragmentSize * 0.6);
        const previousPosition = mesh.getAbsolutePosition().clone();
        this.movementObserver = this.scene.onBeforeRenderObservable.add(() => {
            mesh.computeWorldMatrix(true);
            const position = mesh.getAbsolutePosition();
            const movement = position.subtract(previousPosition);
            origin.addInPlace(movement);
            for (const particle of particles.particles) {
                particle.position.addInPlace(movement);
            }
            previousPosition.copyFrom(position);
        });
        this.renderObserver = this.scene.onAfterRenderObservable.add(() => {
            if (particles.manualEmitCount === 0 && particles.getActiveCount() === 0) {
                this.dispose();
            }
        });
        particles.start();
    }

    private getTexture() {
        const existingTexture = CharacterDamageEffect.texturesByScene.get(this.scene);
        if (existingTexture) {
            return existingTexture;
        }
        const resolution = 16;
        const pixels = new Uint8Array(resolution * resolution * 4);
        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                const radius = Math.abs((x + 0.5) * 2 / resolution - 1) + Math.abs((y + 0.5) * 2 / resolution - 1);
                const opacity = Math.max(0, Math.min(1, (1 - radius) / 0.25));
                const offset = (y * resolution + x) * 4;
                pixels[offset] = 255;
                pixels[offset + 1] = 255;
                pixels[offset + 2] = 255;
                pixels[offset + 3] = Math.round(255 * opacity);
            }
        }
        // Share the tiny sprite for successive damage bursts; its scene owns its lifetime.
        const texture = RawTexture.CreateRGBATexture(pixels, resolution, resolution, this.scene);
        texture.name = 'character-damage-fragment';
        CharacterDamageEffect.texturesByScene.set(this.scene, texture);
        return texture;
    }

    dispose() {
        if (this.isDisposed) {
            return;
        }
        this.isDisposed = true;
        this.scene.onAfterRenderObservable.remove(this.renderObserver);
        this.scene.onBeforeRenderObservable.remove(this.movementObserver);
        this.particles.dispose(false);
        this.onFinished();
    }
}
