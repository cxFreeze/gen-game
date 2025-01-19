import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { App } from '../core/app';

export class LightingManager {
    private sun: DirectionalLight;
    private ambiantLight: HemisphericLight;
    private sunX: number = 0;
    private sunY: number = 500;
    private sunZ: number = -500;

    private _shadowGenerator: ShadowGenerator;
    public get shadowGenerator() {
        return this._shadowGenerator;
    }

    private static instance: LightingManager;
    static getInstance(): LightingManager {
        if (!this.instance) {
            this.instance = new LightingManager();
        }
        return this.instance;
    }

    private constructor() {
    }

    public createLightning() {
        this.ambiantLight = new HemisphericLight('ambiantLight', new Vector3(0, 10, 0), App.scene);
        this.ambiantLight.intensity = 0.7;

        this.sun = new DirectionalLight('sun', new Vector3(0.5, -1, 0.5), App.scene);
        this.sun.position = new Vector3(this.sunX, this.sunY, this.sunZ);
        this.sun.intensity = 3;

        this._shadowGenerator = new ShadowGenerator(2048, this.sun);
        this._shadowGenerator.usePercentageCloserFiltering = true;
        this._shadowGenerator.bias = 0.001;
        this._shadowGenerator.transparencyShadow = true;
    }

    public setSunPosition(x: number, z: number) {
        this.sun.position = new Vector3(this.sunX + x, this.sunY, this.sunZ + z);
    }

    public toggleShadows() {
        this.sun.shadowEnabled = !this.sun.shadowEnabled;
    }
}