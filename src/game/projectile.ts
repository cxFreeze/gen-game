import { Ray } from '@babylonjs/core/Culling/ray';
import { Color4 } from '@babylonjs/core/Maths/math';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { App } from '../core/app';
import { WorldUtils } from '../utils/world-utils';
import { AssetManager } from '../world/assets';

export class Projectile {
    private speed: number;
    private direction: number;
    private damage: number;
    private mesh: InstancedMesh;
    private origMesh: AbstractMesh;

    isDestroyed: boolean = false;

    private meshY;
    private initialPosition: Vector3;

    private timeCreated: number = Date.now();
    private timeUpdated: number = Date.now();

    private distanceToTravel: number = 500;

    constructor(speed: number, direction: number, damage: number, origMesh: AbstractMesh) {
        this.speed = speed * 30;
        this.direction = direction;
        this.damage = damage;
        this.origMesh = origMesh;

        const scale = 2.5 * Math.cbrt(this.damage);

        this.mesh = AssetManager.projectile.createInstance('projectile');
        this.mesh.scaling = new Vector3(scale, scale, scale);
        const pos = origMesh.position.clone();

        this.meshY = scale / 2;
        pos.y = this.meshY;
        pos.x += scale / 2 * Math.sin(this.direction);
        pos.z += scale / 2 * Math.cos(this.direction);

        this.mesh.position = pos;
        this.initialPosition = pos;

        const directionVector = new Vector3(Math.sin(this.direction), 0, Math.cos(this.direction));

        const ray = new Ray(this.mesh.position, directionVector.normalize(), 500);
        const hit = App.scene.pickWithRay(ray, (mesh) => {
            return mesh.name !== this.mesh.name && mesh !== this.origMesh && !mesh.name.includes('collider');
        });

        if (hit && hit.pickedMesh) {
            this.distanceToTravel = hit.distance - scale / 2;
        }
    }

    updatePosition() {
        if (this.mesh == null) {
            return;
        }

        this.timeUpdated = Date.now();

        const distance = this.speed * ((this.timeUpdated - this.timeCreated) / 1000);

        this.mesh.position = this.initialPosition.add(new Vector3(Math.sin(this.direction) * distance, 0, Math.cos(this.direction) * distance));
        this.mesh.position.y = this.meshY;

        if (distance > this.distanceToTravel || !this.isPositionValid(this.mesh.position)) {
            this.destroy();
        }
    }

    isPositionValid(position: Vector3) {
        if (!WorldUtils.isInWorldBounds(position.x, position.z)) {
            return false;
        }

        return true;
    }

    destroy() {
        App.scene.removeMesh(this.mesh);
        this.isDestroyed = true;
        this.createExplosion(this.mesh.position);
        this.mesh.dispose();
        this.mesh = null as any;
    }

    createExplosion(position: Vector3) {
        const particleSystem = new ParticleSystem('particles', 100, App.scene);
        particleSystem.particleTexture = AssetManager.flareSprite.clone();

        // Position de l’explosion
        particleSystem.emitter = position.clone();

        // Couleur des particules
        particleSystem.color1 = new Color4(0.36, 0.15, 0.8, 1);
        particleSystem.color2 = new Color4(0.5, 0.4, 0.9, 1);
        particleSystem.colorDead = new Color4(0, 0, 0, 0);
        // Taille des particules
        particleSystem.minSize = 2;
        particleSystem.maxSize = 5;

        // Durée de vie des particules
        particleSystem.minLifeTime = 0.1;
        particleSystem.maxLifeTime = 0.3;

        // Direction et vitesse d'éparpillement
        particleSystem.emitRate = 500;
        particleSystem.direction1 = new Vector3(-1, 1, -1);
        particleSystem.direction2 = new Vector3(1, 1, 1);
        particleSystem.minEmitPower = 20;
        particleSystem.maxEmitPower = 40;
        particleSystem.gravity = new Vector3(0, -25, 0); // Gravité pour effet réaliste

        // Lancer l'effet
        particleSystem.start();

        // Supprimer après 1 seconde pour éviter d'utiliser trop de mémoire
        setTimeout(() => {
            particleSystem.stop();
        }, 200);
        setTimeout(() => {
            particleSystem.dispose();
        }, 500);
    }


}