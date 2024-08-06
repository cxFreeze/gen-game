import { Application, Container } from 'pixi.js';
import { AssetManager } from './engine/assets.js';
import { PlayerManager } from './engine/player.js';
import { WorldManager } from './engine/world.js';

// Asynchronous IIFE
(async () => {
    // create the app
    const app = new Application();
    await app.init({ background: '#4bcf51', resizeTo: window });
    document.body.appendChild(app.canvas);

    await AssetManager.loadAssets();
    await WorldManager.createWorld(app);
    await PlayerManager.createPlayer(app);

    app.ticker.add((time) => {

    });

})();


