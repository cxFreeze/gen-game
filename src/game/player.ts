import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { BehaviorSubject, debounceTime, merge, Subject, take, throttleTime } from 'rxjs';
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
    private readonly _playerMoved$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    get playerMoved$() {
        return this._playerMoved$.pipe(take(2));
    }

    private readonly recalculateAimLine$ = new Subject<number>();
    private aimLine: Mesh | null = null;
    private lastAimDirection: number = 0;
    private showAimLine: boolean = false;

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

        this.createAimLine();

        if (Debug.showPlayerCollider) {
            const ellipsoid = MeshBuilder.CreateSphere('debug', { diameterX: (this._mesh.ellipsoid.x * 2) / scale, diameterY: (this._mesh.ellipsoid.y * 2) / scale, diameterZ: (this._mesh.ellipsoid.z * 2) / scale, segments: 16 }, App.scene);
            ellipsoid.position = new Vector3(0, (playerHeight / 2) / scale, 0);
            ellipsoid.position.addInPlace(this._mesh.ellipsoidOffset.divide(new Vector3(scale, scale, scale)));
            ellipsoid.parent = this._mesh;
        }

        App.scene.addMesh(this._mesh, false);
        this.lightingManager.shadowGenerator.addShadowCaster(this._mesh);

        merge(this.recalculateAimLine$, PlayerInputs.aimChanged).pipe(throttleTime(25)).subscribe((direction) => {
            this.updateAimLine(direction);
        });

        PlayerInputs.firePressed.pipe(throttleTime(1000 / this.fireRate))
            .subscribe((direction) => {
                this.setAimLineVisible(true);
                const projDir = MathUtils.normalizeAngle(direction);
                this.fireProjectile(projDir);
            });

        PlayerInputs.firePressed.pipe(debounceTime(50))
            .subscribe(() => {
                this.setAimLineVisible(false);
            });
    }

    move(x: number, y: number, direction: CharDirection) {
        if (!this._playerMoved) {
            this._playerMoved = true;
            this._playerMoved$.next(true);
        }
        super.move(x, y, direction);
        this.recalculateAimLine$.next(this.lastAimDirection);
    }

    setPlayerAnimation(animName: typeof this.currentAnimation) {
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

    private createAimLine() {
        this.aimLine = MeshBuilder.CreateCylinder('noproj-aimLine', {
            height: this.range / this.mesh.scaling.x,
            diameter: 0.2,
            tessellation: 16
        }, App.scene);

        const aimMaterial = new StandardMaterial('aimMat', App.scene);
        aimMaterial.emissiveColor = new Color3(1, 0, 0);
        aimMaterial.disableLighting = true;
        aimMaterial.alpha = 0.2;
        this.aimLine.material = aimMaterial;

        this.aimLine.isPickable = false;

        this.aimLine.rotation.x = Math.PI / 2;
        this.aimLine.position.y = 0.2;
        this.aimLine.scaling = new Vector3(this.asset.scale, this.asset.scale, this.asset.scale);
        this.aimLine.setPivotPoint(new Vector3(0, 0, 0));

        this.updateAimLine(this.lastAimDirection);
    }

    private setAimLineVisible(visible: boolean) {
        if (this.showAimLine === visible) {
            return;
        }
        this.showAimLine = visible;
        this.updateAimLine(this.lastAimDirection);
    }


    private updateAimLine(direction: number) {
        this.lastAimDirection = direction;

        if (!this.aimLine) {
            return;
        }

        this.aimLine.isVisible = this.showAimLine;

        if (!this.showAimLine) {
            return;
        }

        this.aimLine.position.x = this.mesh.position.x + (Math.sin(direction) * this.range / 2);
        this.aimLine.position.z = this.mesh.position.z + (Math.cos(direction) * this.range / 2);

        this.aimLine.rotation.y = direction;
    }
}