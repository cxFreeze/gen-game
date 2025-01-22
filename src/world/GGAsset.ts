import { Material } from '@babylonjs/core/Materials/material';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager';

export abstract class GGAsset {
    height: number;
    width: number;
    name: string;
    scale: number;
    safeZone: number;
    displacementRatio: number;
    sizeRatio: number;
    type: 'ground' | 'item' | 'sprite' | 'player';
    ignoreCollisions: boolean;
    maxVerticalDisplacement: number;

    constructor(name: string) {
        this.height = 0;
        this.width = 0;
        this.name = name;
        this.scale = 1;
        this.safeZone = 0;
        this.displacementRatio = 0;
        this.sizeRatio = 0;
        this.type = 'item';
        this.ignoreCollisions = false;
        this.maxVerticalDisplacement = 0;
    }
}

export class GG3DAsset extends GGAsset {
    private _mesh: Mesh;
    get mesh() {
        return this._mesh;
    }
    private _sizeX: number;
    get sizeX() {
        return this._sizeX;
    }
    private _sizeY: number;
    get sizeY() {
        return this._sizeY;
    }
    private _sizeZ: number;
    get sizeZ() {
        return this._sizeZ;
    }

    private _isPickable: boolean;
    get isPickable() {
        return this._isPickable;
    }
    set isPickable(value: boolean) {
        this._isPickable = value; this._mesh.isPickable = value;
    };

    disableShadow: boolean;

    constructor(name: string, mesh: Mesh, material?: Material) {
        super(name);
        this._mesh = mesh;
        this._mesh.isVisible = false;
        this._mesh.receiveShadows = true;
        this.disableShadow = false;
        this.isPickable = true;
        if (material) {
            this._mesh.material = material;
        }

        const boundingBox = this._mesh.getBoundingInfo().boundingBox;
        this._sizeX = boundingBox.maximumWorld.x - boundingBox.minimumWorld.x;
        this._sizeY = boundingBox.maximumWorld.y - boundingBox.minimumWorld.y;
        this._sizeZ = boundingBox.maximumWorld.z - boundingBox.minimumWorld.z;

        mesh.setPivotPoint(new Vector3(0, boundingBox.minimum.y, 0));
    }
}

export class GGSpriteAsset extends GGAsset {
    private _sprite: SpriteManager;
    get sprite() {
        return this._sprite;
    }

    constructor(name: string, sprite: SpriteManager) {
        super(name);
        this._sprite = sprite;
        this.type = 'sprite';
    }
}