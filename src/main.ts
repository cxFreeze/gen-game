import { Application } from 'pixi.js';
import { AssetManager } from './engine/assets.js';
import { PlayerMovement } from './engine/player-movement.js';
import { PlayerManager } from './engine/player.js';
import { WorldManager } from './engine/world.js';

// Asynchronous IIFE
(async () => {
    // create the app
    const app = new Application();
    await app.init({ background: '#61eb34', resizeTo: window, });
    document.body.appendChild(app.canvas);

    await AssetManager.loadAssets();
    WorldManager.createWorld(app);
    PlayerManager.createPlayer();
    PlayerMovement.init();

    WorldManager.generateWorld();
    app.ticker.add((time) => {
        PlayerMovement.updatePlayerPosition(time.elapsedMS);
        WorldManager.updateDebugInfos(time);
    });
})();


