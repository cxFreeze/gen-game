import { Application, Container, Graphics } from "pixi.js";
import { GGAsset } from "./assets.js";

export function draw(container: Container, asset: GGAsset, x: number, y: number) {
    const graphics = new Graphics(asset.asset);
    graphics.width = asset.width;
    graphics.height = asset.height;
    graphics.x = x;
    graphics.y = y;
    container.addChild(graphics);
}
