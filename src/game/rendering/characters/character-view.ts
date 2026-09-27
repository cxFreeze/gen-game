import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import type { Subscription } from 'rxjs';
import type { CharacterBody } from '../../gameplay/characters/character-body.interface';
import type { Position } from '../../math/position';
import { AssetUtils } from '../animation/assets-utils';
import { GameRuntime } from '../../runtime/game-runtime';

export class CharacterView implements CharacterBody {
    readonly mesh: AbstractMesh;
    protected isDisposed = false;
    private rotationAnimation: Subscription | undefined;
    private readonly getProjectileMesh: (id: string) => AbstractMesh | undefined;
    private readonly onDispose: () => void;

    constructor(mesh: AbstractMesh, getProjectileMesh: (id: string) => AbstractMesh | undefined, onDispose: () => void) {
        this.mesh = mesh;
        this.getProjectileMesh = getProjectileMesh;
        this.onDispose = onDispose;
    }

    get body(): CharacterBody {
        return this;
    }

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
        this.mesh.computeWorldMatrix(true);
        this.mesh.moveWithCollisions(new Vector3(x, 0, z));
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
        const projectile = this.getProjectileMesh(id);
        if (!projectile) {
            return false;
        }
        projectile.computeWorldMatrix();
        this.mesh.computeWorldMatrix();
        return this.mesh.intersectsMesh(projectile, true);
    }

    hasLineOfSight(target: Position, range: number) {
        const origin = new Vector3(this.mesh.position.x, 3, this.mesh.position.z);
        const direction = new Vector3(target.x, 3, target.z).subtract(origin).normalize();
        const hit = GameRuntime.scene.pickWithRay(new Ray(origin, direction, range), candidate => candidate !== this.mesh && !candidate.name.includes('projectile') && candidate.isPickable);
        return !!(hit?.hit && hit.pickedMesh?.name === 'player');
    }

    dispose() {
        if (this.isDisposed) {
            return;
        }
        this.isDisposed = true;
        this.rotationAnimation?.unsubscribe();
        this.mesh.dispose();
        this.onDispose();
    }
}
