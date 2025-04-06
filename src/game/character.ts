import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Subscription } from 'rxjs';
import { Params } from '../core/params';
import { CharacterStats } from '../models/interfaces';
import { AssetUtils } from '../utils/assets-utils';
import { WorldUtils } from '../utils/world-utils';
import { GG3DAsset } from '../world/GGAsset';
import { LightingManager } from '../world/lighting';
import { ProjectilesManager } from './projectiles';

export type CharDirection = 'front' | 'back' | 'left' | 'right' | 'front-left' | 'front-right' | 'back-left' | 'back-right';



export class Character {
    protected _mesh: AbstractMesh;
    get mesh(): AbstractMesh {
        return this._mesh;
    }

    asset: GG3DAsset;

    private maxHealth: number;
    private health: number;
    private damage: number;
    //private speed: number;
    private range: number;
    protected fireRate: number;
    private projectileSpeed: number;
    private currentDirection: CharDirection;

    private lastFireTime = 0;

    private _position: Vector3;
    get position(): Vector3 {
        return this._position;
    }

    get name(): string {
        return this._mesh.name;
    }

    private currentRotateAnim$: Subscription | undefined;

    private _isDead = false;
    get isDead(): boolean {
        return this._isDead;
    }

    private readonly projectileManager = ProjectilesManager.getInstance();
    protected readonly lightingManager = LightingManager.getInstance();


    constructor(asset: GG3DAsset | null, position: Vector3, stats: CharacterStats) {
        if (asset) {
            this.asset = asset;
            this._mesh = asset.mesh!.createInstance(`char-${asset.name}${Params.enemyNameCount}`);
            this._mesh.position = position.clone();
            this._mesh.scaling = new Vector3(asset.scale, asset.scale, asset.scale);
            this._mesh.receiveShadows = true;
            this._mesh.checkCollisions = true;
            this.lightingManager.shadowGenerator.addShadowCaster(this._mesh);

            this._mesh.computeWorldMatrix(true);

            Params.enemyNameCount++;
        }

        this.maxHealth = stats.health;
        this.health = stats.health;
        this.damage = stats.damage;
        this.range = stats.range;
        this.fireRate = stats.fireRate;
        this.projectileSpeed = stats.projectileSpeed;
        this._position = position;
    }

    tryFireProjectile() {
        const now = Date.now();
        if (now - this.lastFireTime > 1000 / this.fireRate) {
            this.lastFireTime = now;
            this.fireProjectile();
        }
    }


    fireProjectile(direction: number = this._mesh.rotation.y) {
        if (this._isDead) {
            return;
        }
        this.projectileManager.createProjectile({ speed: this.projectileSpeed, damage: this.damage, direction: direction, range: this.range }, this._mesh);
    }

    move(x: number, y: number, direction: CharDirection) {
        if (this._isDead) {
            return;
        }

        this._mesh.computeWorldMatrix(true);

        let oldPos = this._mesh.position.clone();
        this._mesh.moveWithCollisions(new Vector3(x, 0, y));

        this.resetMeshPositionIfInvalid(oldPos);

        const tempX = this._mesh.position.x;
        const tempY = this._mesh.position.z;

        if (tempX === oldPos.x && tempY === oldPos.z && (x !== 0 && y !== 0)) {
            oldPos = this._mesh.position.clone();
            this._mesh.moveWithCollisions(new Vector3(x, 0, 0));
            this.resetMeshPositionIfInvalid(oldPos);

            if (this._mesh.position.x === oldPos.x) {
                oldPos = this._mesh.position.clone();
                this._mesh.moveWithCollisions(new Vector3(0, 0, y));
                this.resetMeshPositionIfInvalid(oldPos);
            }
        }

        this._position = this._mesh.position.clone();

        if (direction !== this.currentDirection) {
            if (this.currentRotateAnim$) {
                this.currentRotateAnim$.unsubscribe();
            }

            this.currentDirection = direction;

            let rotation = 0;

            switch (direction) {
                case 'front':
                    rotation = Math.PI;
                    break;
                case 'back':
                    rotation = 0;
                    break;
                case 'left':
                    rotation = Math.PI / 2;
                    break;
                case 'right':
                    rotation = -Math.PI / 2;
                    break;
                case 'front-left':
                    rotation = Math.PI / 4;
                    break;
                case 'front-right':
                    rotation = - Math.PI / 4;
                    break;
                case 'back-left':
                    rotation = Math.PI - Math.PI / 4;
                    break;
                case 'back-right':
                    rotation = Math.PI + Math.PI / 4;
                    break;
            }

            this.rotate(rotation);
        }
    }

    private resetMeshPositionIfInvalid(oldPosition: Vector3): void {
        if (this._mesh.position.y !== oldPosition.y || !WorldUtils.isInWorldBounds(this._mesh.position.x, this._mesh.position.z)) {
            this._mesh.position = oldPosition;
            this._mesh.computeWorldMatrix(true);
        }
    }

    rotate(rotation: number) {
        if (this.currentRotateAnim$) {
            this.currentRotateAnim$.unsubscribe();
        }

        this.currentRotateAnim$ = AssetUtils.rotateMeshY(this._mesh, rotation, 8);
    }

    takeDamage(damage: number) {
        if (this._isDead) {
            return;
        }

        this.health -= damage;

        if (this.health <= 0) {
            this.health = 0;
        }

        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }

        if (this.health === 0) {
            this.die();
        }
    }

    private die() {
        this._isDead = true;
        this.delete();
    }

    delete() {
        this._mesh.dispose();
    }
}