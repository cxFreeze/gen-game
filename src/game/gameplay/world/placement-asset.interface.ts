/** Placement metadata only; no mesh, material, or texture is needed by gameplay. */
export interface PlacementAsset {
    readonly name: string;
    readonly safeZone: number;
    readonly displacementRatio: number;
    readonly sizeRatio: number;
    readonly maxVerticalDisplacement: number;
}
