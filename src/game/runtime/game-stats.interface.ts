export interface GameStats {
    fps: number;
    /** CPU duration of rendering and game updates, in milliseconds. */
    frameTime: number;
    worldX: number;
    worldY: number;
    meshCount: number;
    polygonCount: number;
}
