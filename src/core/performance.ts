import { HardwareScalingOptimization, PostProcessesOptimization, SceneOptimizer, SceneOptimizerOptions, TextureOptimization } from '@babylonjs/core/Misc/sceneOptimizer';
import { App } from './app';

export class Performance {

    public static setPerformance(maxRefreshRate: number) {
        const options = new SceneOptimizerOptions(maxRefreshRate > 60 ? 60 : maxRefreshRate, 2000);
        options.addOptimization(new PostProcessesOptimization(0));
        options.addOptimization(new TextureOptimization(1, 512));
        options.addOptimization(new HardwareScalingOptimization(1, 2.5, 0.25));

        const optimizer = new SceneOptimizer(App.scene, options, false);
        optimizer.start();
    }

}