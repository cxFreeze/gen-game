import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { isInChunkBounds } from '../../gameplay/world/world-bounds';

export function isMeshInChunkBounds(mesh: AbstractMesh, chunkX: number, chunkY: number, chunkSize: number): boolean {
    const bounds = mesh.getBoundingInfo().boundingBox;
    return isInChunkBounds({
        minX: bounds.minimumWorld.x,
        maxX: bounds.maximumWorld.x,
        minY: bounds.minimumWorld.z,
        maxY: bounds.maximumWorld.z,
    }, chunkX, chunkY, chunkSize);
}
