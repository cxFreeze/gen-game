import { Mesh, Scene, Vector3 } from '@babylonjs/core';
import { Subscription } from 'rxjs';
import { AssetUtils } from './assets-utils.js';
import { AssetManager } from './assets.js';

export type PlayerDirection = 'front' | 'back' | 'left' | 'right' | 'front-left' | 'front-right' | 'back-left' | 'back-right';

export abstract class PlayerManager {
    static playerMesh: Mesh;
    static currentPlayerDirection: PlayerDirection;

    private static absDefaultPlayerX: number = 0;
    private static absDefaultPlayerY: number = 0;

    static playerX: number = 0;
    static playerY: number = 0;

    static currentAnimation: 'Running' | 'Idle' = 'Idle';

    private static currentRotateAnim$: Subscription | undefined;

    static createPlayer(scene: Scene) {
        const scale = AssetManager.player.scale!;
        this.playerMesh = AssetManager.player.mesh!.clone('player');

        const playerHeight = scale * this.playerMesh.getBoundingInfo().boundingBox.maximumWorld.y;

        this.playerMesh.position = new Vector3(this.absDefaultPlayerX, (playerHeight / 2) / scale, this.absDefaultPlayerY);

        this.playerMesh.scaling = new Vector3(scale, scale, scale);

        this.playerMesh.receiveShadows = true;
        this.playerMesh.checkCollisions = true;

        scene.addMesh(this.playerMesh);
    }

    static movePlayer(x: number, y: number, direction: PlayerDirection) {
        let playPos = this.playerMesh.position.clone();
        this.playerMesh.moveWithCollisions(new Vector3(x, 0, y));

        if (this.playerMesh.position.y !== playPos.y) {
            this.playerMesh.position = playPos;
        }

        this.playerX = this.playerMesh.position.x;
        this.playerY = this.playerMesh.position.z;

        if (this.playerX === playPos.x && this.playerY === playPos.z && (x !== 0 && y !== 0)) {
            playPos = this.playerMesh.position.clone();
            this.playerMesh.moveWithCollisions(new Vector3(x, 0, 0));

            if (this.playerMesh.position.y !== playPos.y) {
                this.playerMesh.position = playPos;
            }

            if (this.playerMesh.position.x === playPos.x) {
                playPos = this.playerMesh.position.clone();
                this.playerMesh.moveWithCollisions(new Vector3(0, 0, y));

                if (this.playerMesh.position.y !== playPos.y) {
                    this.playerMesh.position = playPos;
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

            this.currentRotateAnim$ = AssetUtils.rotateMeshY(this.playerMesh, rotation, 10);
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