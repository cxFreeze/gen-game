import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { Subscription } from 'rxjs';
import type { CharacterBody } from '../../gameplay/characters/character-body.interface';
import type { Position } from '../../math/position';
import { AssetUtils } from '../animation/assets-utils';
import { GameRuntime } from '../../runtime/game-runtime';
import type { GamePresentation } from '../game-presentation';
import { CharacterDeathEffect } from './character-death-effect';
import { CharacterHealthBar } from './character-health-bar';
import { CharacterDamageEffect } from './character-damage-effect';

export class CharacterView implements CharacterBody {
    protected isDisposed = false;
    private rotationAnimation: Subscription | undefined;
    private deathEffect: CharacterDeathEffect | undefined;
    private healthBar: CharacterHealthBar | undefined;
    private readonly damageEffects = new Set<CharacterDamageEffect>();
    private readonly displacement = Vector3.Zero();
    private readonly sightRay = new Ray(Vector3.Zero(), Vector3.Zero());
    private readonly isSightObstacle = (candidate: AbstractMesh) => candidate !== this.mesh && !candidate.name.includes('projectile') && candidate.isPickable;
    constructor(readonly mesh: AbstractMesh, private readonly presentation: GamePresentation) {}

    get name() {
        return this.mesh.name;
    }

    get position() {
        return this.mesh.position;
    }

    get rotation() {
        return this.mesh.rotation.y;
    }

    set rotation(value: number) {
        this.mesh.rotation.y = value;
    }

    translate(x: number, z: number) {
        this.displacement.set(x, 0, z);
        this.mesh.computeWorldMatrix(true);
        this.mesh.moveWithCollisions(this.displacement);
    }

    setPosition(position: Position) {
        this.mesh.position.set(position.x, position.y, position.z);
        this.mesh.computeWorldMatrix(true);
    }

    rotate(rotation: number) {
        this.rotationAnimation?.unsubscribe();
        this.rotationAnimation = AssetUtils.rotateMeshY(this.mesh, rotation, 8);
    }

    intersectsProjectile(id: string) {
        const projectile = this.presentation.getProjectileMesh(id);
        if (!projectile) {
            return false;
        }
        projectile.computeWorldMatrix();
        this.mesh.computeWorldMatrix();
        return this.mesh.intersectsMesh(projectile, true);
    }

    hasLineOfSight(target: Position, range: number) {
        this.sightRay.origin.set(this.mesh.position.x, 3, this.mesh.position.z);
        this.sightRay.direction.set(target.x - this.mesh.position.x, 0, target.z - this.mesh.position.z).normalize();
        this.sightRay.length = range;
        const hit = GameRuntime.scene.pickWithRay(this.sightRay, this.isSightObstacle);
        return !!(hit?.hit && hit.pickedMesh?.name === 'player');
    }

    showDamage(previousHealth: number, currentHealth: number, maxHealth: number) {
        if (this.isDisposed || this.deathEffect || currentHealth >= previousHealth) {
            return;
        }
        const effect = new CharacterDamageEffect(this.mesh, () => this.damageEffects.delete(effect));
        this.damageEffects.add(effect);
        this.showHealthBar(previousHealth, currentHealth, maxHealth);
    }

    protected showHealthBar(previousHealth: number, currentHealth: number, maxHealth: number) {
        this.healthBar ??= new CharacterHealthBar(this.mesh, () => this.healthBar = undefined);
        this.healthBar.show(previousHealth, currentHealth, maxHealth);
    }

    showDeath() {
        if (this.isDisposed || this.deathEffect) {
            return;
        }
        this.rotationAnimation?.unsubscribe();
        this.rotationAnimation = undefined;
        this.healthBar?.dispose();
        for (const mesh of [this.mesh, ...this.mesh.getChildMeshes()]) {
            mesh.checkCollisions = false;
            mesh.isPickable = false;
        }
        this.deathEffect = new CharacterDeathEffect(this.mesh, () => this.dispose());
    }

    dispose() {
        if (this.isDisposed) {
            return;
        }
        this.isDisposed = true;
        for (const effect of this.damageEffects) {
            effect.dispose();
        }
        this.rotationAnimation?.unsubscribe();
        this.healthBar?.dispose();
        this.deathEffect?.dispose();
        this.deathEffect = undefined;
        this.mesh.dispose();
        this.presentation.removeCharacter(this.name);
    }
}
