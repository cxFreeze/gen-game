import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { Params } from '../runtime/params';

export class WorldUtils {
    static isInWorldBounds(x: number, y: number): boolean {
        const halfWorldSize = Params.safeDrawWorldSize / 2;
        return x < halfWorldSize && x > -halfWorldSize && y < halfWorldSize && y > -halfWorldSize;
    }

    static isInChunkBounds(mesh: AbstractMesh, chunkX: number, chunkY: number): boolean {
        const boundingBox = mesh.getBoundingInfo().boundingBox;
        const minX = boundingBox.minimumWorld.x;
        const maxX = boundingBox.maximumWorld.x;
        const minY = boundingBox.minimumWorld.z;
        const maxY = boundingBox.maximumWorld.z;

        return minX > chunkX - Params.chunkSize / 2 && maxX < chunkX + Params.chunkSize / 2 && minY > chunkY - Params.chunkSize / 2 && maxY < chunkY + Params.chunkSize / 2;
    }
}