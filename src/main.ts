import { Application } from 'pixi.js';
import { AssetManager } from './world/assets.js';
import { PlayerMovements } from './game/player-movements.js';
import { PlayerManager } from './world/player.js';
import { WorldManager } from './world/world.js';
import { PlayerInputs } from './game/player-inputs.js';
import { Random } from './utils/random.js';

(async () => {
    Random.setSeed();

    // create the app
    const app = new Application();
    await app.init({ resizeTo: window, preference: 'webgpu' });
    document.body.appendChild(app.canvas);

    await AssetManager.loadAssets();
    WorldManager.createWorld(app);
    PlayerManager.createPlayer();
    PlayerInputs.init();
    PlayerMovements.init();

    WorldManager.generateWorld();
    app.ticker.add((time) => {
        PlayerMovements.updatePlayerPosition(time.elapsedMS);
        WorldManager.updateDebugInfos(time);
    });
})();


