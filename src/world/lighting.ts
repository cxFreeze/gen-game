import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { App } from '../core/app';

export class LightingManager {
    private sun: DirectionalLight | null = null;
    private sunX: number = 0;
    private sunY: number = 2000;
    private sunZ: number = -500;

    private _shadowGenerator: ShadowGenerator | null = null;
    public get shadowGenerator(): ShadowGenerator {
        if (!this._shadowGenerator) {
            throw new Error('Lighting must be created before accessing the shadow generator');
        }
        return this._shadowGenerator;
    }

    private static instance: LightingManager | undefined;
    static dispose() {
        this.instance = undefined;
    }
    static getInstance(): LightingManager {
        if (!this.instance) {
            this.instance = new LightingManager();
        }
        return this.instance;
    }

    private constructor() {
    }

    public createLightning() {
        const ambiantLight = new HemisphericLight('ambiantLight', new Vector3(0, 10, 0), App.scene);
        ambiantLight.intensity = 0.7;

        const sun = new DirectionalLight('sun', new Vector3(0.5, -1, 0.5), App.scene);
        sun.position = new Vector3(this.sunX, this.sunY, this.sunZ);
        sun.intensity = 2;
        this.sun = sun;

        const shadowGenerator = new ShadowGenerator(3072, sun);
        shadowGenerator.usePercentageCloserFiltering = true;
        shadowGenerator.bias = 0.001;
        shadowGenerator.transparencyShadow = true;
        this._shadowGenerator = shadowGenerator;
    }

    public setSunPosition(x: number, z: number) {
        this.getSun().position = new Vector3(this.sunX + x, this.sunY, this.sunZ + z);
    }

    public toggleShadows() {
        const sun = this.getSun();
        sun.shadowEnabled = !sun.shadowEnabled;
    }

    private getSun(): DirectionalLight {
        if (!this.sun) {
            throw new Error('Lighting must be created before accessing the sun');
        }
        return this.sun;
    }
}
