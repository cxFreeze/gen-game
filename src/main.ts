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

    await AssetManager.loadAssets();
    WorldManager.createWorld(app);
    PlayerManager.createPlayer();
    PlayerInputs.init();
    PlayerMovements.init();

    WorldManager.generateWorld();

    document.body.appendChild(app.canvas);

    app.ticker.add((time) => {
        PlayerMovements.updatePlayerPosition(time.elapsedMS);
        WorldManager.updateDebugInfos(time);
    });

    setTimeout(() => {
        hideLoadingScreen();
    }, 1000);
})();


function hideLoadingScreen() {
    const el = document.getElementById('loading');
    if (el) {
        el.style.display = 'none';
    }
}


