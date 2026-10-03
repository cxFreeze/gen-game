import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { BehaviorSubject } from 'rxjs';
import type { Position } from '../../math/position';
import type { PlayerBody } from '../../gameplay/characters/character-body.interface';
import { AssetManager } from '../assets/assets';
import { LightingManager } from '../lighting/lighting';
import { GameRuntime } from '../../runtime/game-runtime';
import { CharacterView } from './character-view';
import type { GamePresentation } from '../game-presentation';

export class PlayerView extends CharacterView implements PlayerBody {
    private readonly asset;
    private readonly range: number;
    private readonly aimLine;
    private readonly material: StandardMaterial;
    private readonly moved = new BehaviorSubject(false);
    private currentAnimation = 'Idle';
    readonly playerMoved$ = this.moved.asObservable();

    constructor(position: Position, range: number, presentation: GamePresentation) {
        const asset = AssetManager.getWorldAsset('player');
        const mesh = asset.mesh.clone('player');
        const scale = asset.scale;
        mesh.isVisible = true;
        mesh.position = new Vector3(position.x, -asset.sizeY * scale / 2, position.z);
        mesh.scaling = new Vector3(scale, scale, scale);
        mesh.receiveShadows = true;
        mesh.checkCollisions = true;
        mesh.ellipsoid = new Vector3(3, 10, 3);
        mesh.ellipsoidOffset = new Vector3(0, 5, 0);
        GameRuntime.scene.addMesh(mesh, false);
        LightingManager.getInstance().shadowGenerator.addShadowCaster(mesh);
        super(mesh, presentation);
        this.asset = asset;
        this.range = range;
        this.aimLine = MeshBuilder.CreateCylinder('noproj-aimLine', { height: range / scale, diameter: 0.2, tessellation: 16 }, GameRuntime.scene);
        this.material = new StandardMaterial('aimMat', GameRuntime.scene);
        this.material.emissiveColor = new Color3(1, 0, 0);
        this.material.disableLighting = true;
        this.material.alpha = 0.2;
        this.aimLine.material = this.material;
        this.aimLine.isPickable = false;
        this.aimLine.isVisible = false;
        this.aimLine.rotation.x = Math.PI / 2;
        this.aimLine.position.y = 0.2;
        this.aimLine.scaling = new Vector3(scale, scale, scale);
        this.aimLine.setPivotPoint(Vector3.Zero());
    }

    present(state: Parameters<PlayerBody['present']>[0]) {
        if (state.hasMoved && !this.moved.value) {
            this.moved.next(true);
        }
        const animation = state.isMoving ? 'Running' : 'Idle';
        const next = this.asset.animations[animation];
        if (next && !next.isStarted) {
            this.asset.animations[this.currentAnimation]?.stop().reset();
            this.currentAnimation = animation;
            next.start(true, state.isMoving ? state.movementSpeed / 90 : 1);
        }
        this.aimLine.isVisible = state.isFiring;
        this.aimLine.position.x = this.mesh.position.x + Math.sin(state.aimDirection) * this.range / 2;
        this.aimLine.position.z = this.mesh.position.z + Math.cos(state.aimDirection) * this.range / 2;
        this.aimLine.rotation.y = state.aimDirection;
    }

    override showDeath() {
        if (this.isDisposed) {
            return;
        }
        this.aimLine.isVisible = false;
        this.asset.animations[this.currentAnimation]?.stop();
        super.showDeath();
    }

    override dispose() {
        if (this.isDisposed) {
            return;
        }
        this.moved.complete();
        this.aimLine.dispose();
        this.material.dispose();
        super.dispose();
    }
}
