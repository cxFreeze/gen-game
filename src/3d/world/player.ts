import { Mesh, MeshBuilder, Vector3 } from '@babylonjs/core';
import { Subscription } from 'rxjs';
import { App } from '../../app.js';
import { Debug } from '../../debug.js';
import { AssetUtils } from './assets-utils.js';
import { AssetManager } from './assets.js';

export type PlayerDirection = 'front' | 'back' | 'left' | 'right' | 'front-left' | 'front-right' | 'back-left' | 'back-right';

export abstract class PlayerManager {
    private static _playerMesh: Mesh;
    static get playerMesh() {
        return this._playerMesh;
    }

    private static currentPlayerDirection: PlayerDirection;

    private static absDefaultPlayerX: number = 0;
    private static absDefaultPlayerY: number = 0;

    static playerX: number = 0;
    static playerY: number = 0;

    private static currentAnimation: 'Running' | 'Idle' = 'Idle';

    private static currentRotateAnim$: Subscription | undefined;

    static createPlayer() {
        const scale = AssetManager.player.scale!;
        this._playerMesh = AssetManager.player.mesh!.clone('player');

        const playerHeight = scale * this._playerMesh.getBoundingInfo().boundingBox.maximumWorld.y;

        this._playerMesh.position = new Vector3(this.absDefaultPlayerX, (playerHeight / 2) / scale, this.absDefaultPlayerY);

        this._playerMesh.scaling = new Vector3(scale, scale, scale);

        this._playerMesh.receiveShadows = true;
        this._playerMesh.checkCollisions = true;
        this._playerMesh.ellipsoid = new Vector3(3, 10, 3);
        this._playerMesh.ellipsoidOffset = new Vector3(0, 5, 2);

        if (Debug.showPlayerCollider) {
            const ellipsoid = MeshBuilder.CreateSphere('debug', { diameterX: (this._playerMesh.ellipsoid.x * 2) / scale, diameterY: (this._playerMesh.ellipsoid.y * 2) / scale, diameterZ: (this._playerMesh.ellipsoid.z * 2) / scale, segments: 16 }, App.scene);
            ellipsoid.position.copyFrom(this._playerMesh.position);
            ellipsoid.position.addInPlace(this._playerMesh.ellipsoidOffset.divide(new Vector3(scale, scale, scale)));
            ellipsoid.parent = this._playerMesh;
        }

        App.scene.addMesh(this._playerMesh);
    }

    static movePlayer(x: number, y: number, direction: PlayerDirection) {
        let playPos = this._playerMesh.position.clone();
        this._playerMesh.moveWithCollisions(new Vector3(x, 0, y));

        if (this._playerMesh.position.y !== playPos.y) {
            this._playerMesh.position = playPos;
        }

        this.playerX = this._playerMesh.position.x;
        this.playerY = this._playerMesh.position.z;

        if (this.playerX === playPos.x && this.playerY === playPos.z && (x !== 0 && y !== 0)) {
            playPos = this._playerMesh.position.clone();
            this._playerMesh.moveWithCollisions(new Vector3(x, 0, 0));

            if (this._playerMesh.position.y !== playPos.y) {
                this._playerMesh.position = playPos;
            }

            if (this._playerMesh.position.x === playPos.x) {
                playPos = this._playerMesh.position.clone();
                this._playerMesh.moveWithCollisions(new Vector3(0, 0, y));

                if (this._playerMesh.position.y !== playPos.y) {
                    this._playerMesh.position = playPos;
                }
            }

        }

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

    static setPlayerAnimation(animName: 'Running' | 'Idle') {
        const anim = AssetManager.animations[animName];
        if (!anim || anim.isStarted) {
            return;
        }

        AssetManager.animations[this.currentAnimation].stop();

        this.currentAnimation = animName;
        AssetManager.animations[animName].start(true);
    }
}