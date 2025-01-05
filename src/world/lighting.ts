import { DirectionalLight, HemisphericLight, ShadowGenerator, Vector3 } from '@babylonjs/core';
import { App } from '../app';


export abstract class LightingManager {
    private static sun: DirectionalLight;
    private static ambiantLight: HemisphericLight;
    private static sunX: number = 0;
    private static sunY: number = 500;
    private static sunZ: number = -500;

    private static _shadowGenerator: ShadowGenerator;
    public static get shadowGenerator() {
        return this._shadowGenerator;
    }

    public static createLightning() {
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

    public static setSunPosition(x: number, z: number) {
        this.sun.position = new Vector3(this.sunX + x, this.sunY, this.sunZ + z);
    }
}