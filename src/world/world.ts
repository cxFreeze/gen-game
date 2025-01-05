import { Animation, UniversalCamera, Vector3 } from '@babylonjs/core';
import { timer } from 'rxjs';
import { App } from '../app.js';
import { Biome, BiomeType } from '../interfaces.js';
import { Anim } from '../utils/anim.js';
import { LightingManager } from './lighting.js';
import { PlayerManager } from './player.js';
import { WorldGenerator } from './world-generator.js';

export abstract class WorldManager {

    static worldX: number = 0;
    static worldY: number = 0;

    static camera: UniversalCamera;
    private static cameraX: number = 0;
    private static cameraY: number = 220;
    private static cameraZ: number = -200;

    private static initCameraY: number = 40;
    private static initCameraZ: number = 25;

    static currentBiome: BiomeType = BiomeType.forest;

    static biomes: { [key in BiomeType]: Biome };


    static createWorld() {
        this.initBiomes();
        this.camera = new UniversalCamera('camera', new Vector3(0, 0, 0), App.scene);
    }

    static initBiomes() {
        const forestBiomes: Biome = {
            ground: 'ground',
            items: [
                {
                    asset: 'tree',
                    drawCount: 40,
                    boostDrawCount: 100,
                    boostDrawCountRate: 0.2
                },
                {
                    asset: 'rock',
                    drawCount: 8,
                },
                {
                    asset: 'grass',
                    drawCount: 80
                }
            ]
        };

        this.biomes = {
            [BiomeType.forest]: forestBiomes
        };
    }

    static generateWorld() {
        WorldGenerator.initRenderLoopExtras();
        this.setCameraPosition(0, 0);
        LightingManager.shadowGenerator.addShadowCaster(PlayerManager.playerMesh);

        this.camera.position = new Vector3(0, this.initCameraY, this.initCameraZ);
        const initRot = this.camera.rotation!.clone();
        this.camera.rotation = initRot.clone().addInPlace(new Vector3(0, Math.PI, 0));

        timer(2000).subscribe(() => {
            if (PlayerManager.playerX !== 0 || PlayerManager.playerY !== 0) {
                return;
            }
            Animation.CreateAndStartAnimation('initCamera1', this.camera, 'position', 30, 120, this.camera.position, new Vector3(this.cameraX, this.cameraY, this.cameraZ), 0, Anim.cubicEaseInOut);
            Animation.CreateAndStartAnimation('initCamera2', this.camera, 'rotation', 30, 120, this.camera.rotation, initRot, 0, Anim.cubicEaseInOut);
        });
    }

    static setCameraPosition(x: number, y: number) {
        this.worldX = x;
        this.worldY = y;

        this.camera.position = new Vector3(x + this.cameraX, this.cameraY, y + this.cameraZ);
        this.camera.setTarget(PlayerManager.playerMesh.position);

        LightingManager.setSunPosition(x, y);
        WorldGenerator.generateWorld();
    }
}