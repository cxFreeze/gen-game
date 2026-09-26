import { HardwareScalingOptimization, PostProcessesOptimization, SceneOptimizer, SceneOptimizerOptions } from '@babylonjs/core/Misc/sceneOptimizer.js';
import { GameRuntime } from './game-runtime';

export class Performance {
    private static readonly optimizers: SceneOptimizer[] = [];

    static dispose() {
        this.optimizers.forEach(optimizer => optimizer.dispose());
        this.optimizers.length = 0;
    }

    public static setPerformance(maxRefreshRate: number) {
        GameRuntime.engine.setHardwareScalingLevel(1);

        const refreshTarget = maxRefreshRate > 50 ? 50 : maxRefreshRate;

        const options = new SceneOptimizerOptions(refreshTarget, 2000);
        options.addOptimization(new PostProcessesOptimization(0));
        //options.addOptimization(new TextureOptimization(1, 512));
        options.addOptimization(new HardwareScalingOptimization(1, 2.5, 0.25));

        const optimizer = new SceneOptimizer(GameRuntime.scene, options, true, false);

        const options2 = new SceneOptimizerOptions(refreshTarget, 5000);
        options2.addOptimization(new PostProcessesOptimization(1));
        options2.addOptimization(new HardwareScalingOptimization(1, 1, 0.25));
        //options2.addOptimization(new TextureOptimization(2, 4096));

        const optimizer2 = new SceneOptimizer(GameRuntime.scene, options2, true, true);
        this.optimizers.push(optimizer, optimizer2);

        optimizer2.onNewOptimizationAppliedObservable.add((opt) => {
            console.info('High framerate : ', opt.getDescription());
        });

        optimizer2.onFailureObservable.add(() => {
            GameRuntime.schedule(() => {
                optimizer2.start();
            }, 5000);
        });

        optimizer.onNewOptimizationAppliedObservable.add((opt) => {
            optimizer2.start();
            console.info('Low framerate : ', opt.getDescription());
        });

        optimizer.onFailureObservable.add(() => {
            GameRuntime.schedule(() => {
                optimizer.start();
            }, 5000);
        });

        optimizer.start();
    }
}
