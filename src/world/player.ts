import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { BehaviorSubject, Subscription, take } from 'rxjs';
import { App } from '../core/app.js';
import { Debug } from '../core/debug.js';
import { Params } from '../core/params.js';
import { AssetUtils } from '../utils/assets-utils.js';
import { WorldUtils } from '../utils/world-utils.js';
import { AssetManager } from './assets.js';
import { LightingManager } from './lighting.js';

export type PlayerDirection = 'front' | 'back' | 'left' | 'right' | 'front-left' | 'front-right' | 'back-left' | 'back-right';

export class PlayerManager {
    private _playerMesh: Mesh;
    get playerMesh() {
        return this._playerMesh;
    }

    private _playerMoved: boolean = false;
    private _playerMoved$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    get playerMoved$() {
        return this._playerMoved$.pipe(take(2));
    }

    private currentPlayerDirection: PlayerDirection;

    playerX: number = Params.playerInitX;
    playerY: number = Params.playerInitY;

    private currentAnimation: 'Running' | 'Idle' = 'Idle';
    private currentRotateAnim$: Subscription | undefined;

    private readonly lightingManager = LightingManager.getInstance();

    private static instance: PlayerManager;
    static getInstance(): PlayerManager {
        if (!this.instance) {
            this.instance = new PlayerManager();
        }
        return this.instance;
    }

    private constructor() { }

    createPlayer() {
        const scale = AssetManager.worldAssets.player.scale;
        this._playerMesh = AssetManager.worldAssets.player.mesh!.clone('player');
        this._playerMesh.isVisible = true;

        const playerHeight = AssetManager.worldAssets.player.sizeY * scale;

        this._playerMesh.position = new Vector3(this.playerX, -playerHeight / 2, this.playerY);
        this._playerMesh.scaling = new Vector3(scale, scale, scale);

        this._playerMesh.receiveShadows = true;
        this._playerMesh.checkCollisions = true;
        this._playerMesh.ellipsoid = new Vector3(3, 10, 3);
        this._playerMesh.ellipsoidOffset = new Vector3(0, 5, 0);

        if (Debug.showPlayerCollider) {
            const ellipsoid = MeshBuilder.CreateSphere('debug', { diameterX: (this._playerMesh.ellipsoid.x * 2) / scale, diameterY: (this._playerMesh.ellipsoid.y * 2) / scale, diameterZ: (this._playerMesh.ellipsoid.z * 2) / scale, segments: 16 }, App.scene);
            ellipsoid.position = new Vector3(0, (playerHeight / 2) / scale, 0);
            ellipsoid.position.addInPlace(this._playerMesh.ellipsoidOffset.divide(new Vector3(scale, scale, scale)));
            ellipsoid.parent = this._playerMesh;
        }

        App.scene.addMesh(this._playerMesh, false);
        this.lightingManager.shadowGenerator.addShadowCaster(this._playerMesh);
    }

    movePlayer(x: number, y: number, direction: PlayerDirection) {
        if (!this._playerMoved) {
            this._playerMoved = true;
            this._playerMoved$.next(true);
        }

        let oldPos = this._playerMesh.position.clone();
        this._playerMesh.moveWithCollisions(new Vector3(x, 0, y));


        this.resetPlayerPositionIfInvalid(oldPos);

        const tempX = this._playerMesh.position.x;
        const tempY = this._playerMesh.position.z;

        if (tempX === oldPos.x && tempY === oldPos.z && (x !== 0 && y !== 0)) {
            oldPos = this._playerMesh.position.clone();
            this._playerMesh.moveWithCollisions(new Vector3(x, 0, 0));
            this.resetPlayerPositionIfInvalid(oldPos);

            if (this._playerMesh.position.x === oldPos.x) {
                oldPos = this._playerMesh.position.clone();
                this._playerMesh.moveWithCollisions(new Vector3(0, 0, y));
                this.resetPlayerPositionIfInvalid(oldPos);
            }
        }

        this.playerX = this._playerMesh.position.x;
        this.playerY = this._playerMesh.position.z;

        if (direction !== this.currentPlayerDirection) {
            if (this.currentRotateAnim$) {
                this.currentRotateAnim$.unsubscribe();
            }

            this.currentPlayerDirection = direction;

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

            this.currentRotateAnim$ = AssetUtils.rotateMeshY(this._playerMesh, rotation, 10);
        }
    }

    setPlayerAnimation(animName: 'Running' | 'Idle') {
        const anim = AssetManager.animations[animName];
        if (!anim || anim.isStarted) {
            return;
        }

        let animSpeed = 1;

        if (animName === 'Running') {
            animSpeed = Params.playerMoveSpeed / 90;
        }

        AssetManager.animations[this.currentAnimation].stop().reset();

        this.currentAnimation = animName;
        AssetManager.animations[animName].start(true, animSpeed);
    }

    resetPlayerPositionIfInvalid(oldPosition: Vector3): void {
        if (this._playerMesh.position.y !== oldPosition.y || !WorldUtils.isInWorldBounds(this._playerMesh.position.x, this._playerMesh.position.z)) {
            this._playerMesh.position = oldPosition;
        }
    }
}