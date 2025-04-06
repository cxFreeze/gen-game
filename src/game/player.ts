import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { BehaviorSubject, take, throttleTime } from 'rxjs';
import { App } from '../core/app.js';
import { Debug } from '../core/debug.js';
import { Params } from '../core/params.js';
import { MathUtils } from '../utils/math.js';
import { AssetManager } from '../world/assets.js';
import { GG3DAsset } from '../world/GGAsset.js';
import { Character, CharDirection } from './character.js';
import { PlayerInputs } from './player-inputs.js';

export class Player extends Character {
    private _playerMoved: boolean = false;
    private _playerMoved$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    get playerMoved$() {
        return this._playerMoved$.pipe(take(2));
    }

    private currentAnimation: 'Running' | 'Idle' = 'Idle';

    private static instance: Player;
    static getInstance(): Player {
        if (!this.instance) {
            this.instance = new Player();
        }
        return this.instance;
    }

    asset: GG3DAsset = AssetManager.worldAssets.player;

    private constructor() {
        super(null, new Vector3(Params.playerInitX, 0, Params.playerInitY), {
            health: 100,
            damage: 10,
            speed: 1,
            fireRate: 2,
            projectileSpeed: 10,
            range: 250,
        });
    }

    createPlayer() {
        const scale = this.asset.scale;
        this._mesh = this.asset.mesh!.clone('player');
        this._mesh.isVisible = true;

        const playerHeight = this.asset.sizeY * scale;

        this._mesh.position = new Vector3(Params.playerInitX, -playerHeight / 2, Params.playerInitY);
        this._mesh.scaling = new Vector3(scale, scale, scale);

        this._mesh.receiveShadows = true;
        this._mesh.checkCollisions = true;
        this._mesh.ellipsoid = new Vector3(3, 10, 3);
        this._mesh.ellipsoidOffset = new Vector3(0, 5, 0);

        if (Debug.showPlayerCollider) {
            const ellipsoid = MeshBuilder.CreateSphere('debug', { diameterX: (this._mesh.ellipsoid.x * 2) / scale, diameterY: (this._mesh.ellipsoid.y * 2) / scale, diameterZ: (this._mesh.ellipsoid.z * 2) / scale, segments: 16 }, App.scene);
            ellipsoid.position = new Vector3(0, (playerHeight / 2) / scale, 0);
            ellipsoid.position.addInPlace(this._mesh.ellipsoidOffset.divide(new Vector3(scale, scale, scale)));
            ellipsoid.parent = this._mesh;
        }

        App.scene.addMesh(this._mesh, false);
        this.lightingManager.shadowGenerator.addShadowCaster(this._mesh);

        PlayerInputs.arrowPressed.pipe(throttleTime(1000 / this.fireRate)).subscribe((direction) => {
            //const playerDir = MathUtils.normalizeAngle(this._mesh.rotation.y);
            const projDir = MathUtils.normalizeAngle(direction);

            /*
            let diff = Math.abs(playerDir - projDir);
            if (diff > Math.PI) {
                diff = 2 * Math.PI - diff;
            }
            
            if (diff > Math.PI / 2) {
                return;
            }
            */

            this.fireProjectile(projDir);
        });
    }

    move(x: number, y: number, direction: CharDirection) {
        if (!this._playerMoved) {
            this._playerMoved = true;
            this._playerMoved$.next(true);
        }
        super.move(x, y, direction);
    }

    setPlayerAnimation(animName: 'Running' | 'Idle') {
        const anim = this.asset.animations[animName];
        if (!anim || anim.isStarted) {
            return;
        }

        let animSpeed = 1;

        if (animName === 'Running') {
            animSpeed = Params.playerMoveSpeed / 90;
        }

        this.asset.animations[this.currentAnimation].stop().reset();

        this.currentAnimation = animName;
        this.asset.animations[animName].start(true, animSpeed);
    }


}