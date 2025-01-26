import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Params } from '../core/params';

export class WorldUtils {
    static isInWorldBounds(chunkX: number, chunkY: number): boolean {
        const halfWorldSize = Params.safeDrawWorldSize / 2;
        return chunkX < halfWorldSize && chunkX > -halfWorldSize && chunkY < halfWorldSize && chunkY > -halfWorldSize;
    }

    static isInChunkBounds(mesh: AbstractMesh, chunkX: number, chunkY: number): boolean {
        const boundingBox = mesh.getBoundingInfo().boundingBox;
        const minX = boundingBox.minimumWorld.x;
        const maxX = boundingBox.maximumWorld.x;
        const minY = boundingBox.minimumWorld.z;
        const maxY = boundingBox.maximumWorld.z;

        return minX > chunkX - Params.chunckSize / 2 && maxX < chunkX + Params.chunckSize / 2 && minY > chunkY - Params.chunckSize / 2 && maxY < chunkY + + Params.chunckSize / 2;
    }
}