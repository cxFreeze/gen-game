import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import type { Position } from '../../math/position';
import type { ProjectileBody } from '../../gameplay/projectiles/projectile-body.interface';
import { GameRuntime } from '../../runtime/game-runtime';
import { AssetManager } from '../assets/assets';

export class ProjectileView implements ProjectileBody {
    readonly mesh;
    readonly obstacleDistance: number;
    private readonly onDispose: () => void;

    constructor(id: string, appearance: {
        damage: number;
        direction: number;
    }, owner: AbstractMesh, onDispose: () => void) {
        const scale = 2.5 * Math.cbrt(appearance.damage);
        const mesh = AssetManager.projectile.createInstance(id);
        mesh.scaling = new Vector3(scale, scale, scale);
        mesh.position = new Vector3(owner.position.x + scale / 2 * Math.sin(appearance.direction), scale / 2, owner.position.z + scale / 2 * Math.cos(appearance.direction));
        const direction = new Vector3(Math.sin(appearance.direction), 0, Math.cos(appearance.direction));
        const hit = GameRuntime.scene.pickWithRay(new Ray(mesh.position, direction.normalize(), 500), candidate => candidate !== mesh && candidate !== owner && !candidate.name.includes('collider') && !candidate.name.includes('projectile')
            && candidate.name !== 'player' && !candidate.name.startsWith('char-') && !candidate.name.startsWith('noproj-'));
        this.mesh = mesh;
        this.obstacleDistance = hit?.pickedMesh ? hit.distance - scale / 2 : Infinity;
        this.onDispose = onDispose;
    }

    get body(): ProjectileBody {
        return this;
    }

    get position() {
        return this.mesh.position;
    }

    setPosition(position: Position) {
        this.mesh.position.set(position.x, position.y, position.z);
    }

    showImpact() {
        const particles = new ParticleSystem('particles', 100, GameRuntime.scene);
        const texture = AssetManager.flareSprite.clone();
        particles.particleTexture = texture;
        particles.emitter = this.mesh.position.clone();
        particles.color1 = new Color4(0.36, 0.15, 0.8, 1);
        particles.color2 = new Color4(0.5, 0.4, 0.9, 1);
        particles.colorDead = new Color4(0, 0, 0, 0);
        particles.minSize = 2;
        particles.maxSize = 5;
        particles.minLifeTime = 0.1;
        particles.maxLifeTime = 0.3;
        particles.emitRate = 500;
        particles.direction1 = new Vector3(-1, 1, -1);
        particles.direction2 = new Vector3(1, 1, 1);
        particles.minEmitPower = 20;
        particles.maxEmitPower = 40;
        particles.gravity = new Vector3(0, -25, 0);
        particles.start();
        GameRuntime.schedule(() => particles.stop(), 200);
        GameRuntime.schedule(() => {
            particles.dispose();
            texture.dispose();
        }, 500);
    }

    dispose() {
        this.mesh.dispose();
        this.onDispose();
    }
}
