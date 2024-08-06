import { Application, Container } from 'pixi.js';
import { loadAssets, tree } from './engine/assets.js';
import { draw } from './engine/utils.js';

// Asynchronous IIFE
(async () => {
    const app = new Application();

    await app.init({ background: '#4bcf51', resizeTo: window });
    document.body.appendChild(app.canvas);

    const worldContainer = new Container();
    worldContainer.x = app.screen.width / 2;
    worldContainer.y = app.screen.height / 2;
    worldContainer.height = app.screen.height;
    worldContainer.width = app.screen.width;

    app.stage.addChild(worldContainer);

    await loadAssets();

    draw(worldContainer, tree, -800, -400);
    draw(worldContainer, tree, -800, -600);
    draw(worldContainer, tree, -300, -200);
    draw(worldContainer, tree, 300, -400);

    app.ticker.add((time) => {

    });

})();


