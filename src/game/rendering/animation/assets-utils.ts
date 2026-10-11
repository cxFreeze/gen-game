import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { Observable, takeUntil } from 'rxjs';
import { Anim } from './anim';


export abstract class AssetUtils {

    static rotateMeshY(mesh: AbstractMesh, rotation: number, velocity: number) {

        if (mesh.rotation.y === rotation) {
            return;
        }

        if (mesh.rotation.y > Math.PI) {
            mesh.rotation.set(0, mesh.rotation.y - 2 * Math.PI, 0);
            mesh.rotationQuaternion = null;
        }
        else if (mesh.rotation.y < -Math.PI) {
            mesh.rotation.set(0, mesh.rotation.y + 2 * Math.PI, 0);
            mesh.rotationQuaternion = null;
        }

        if (Math.abs(mesh.rotation.y - rotation) > Math.PI) {
            if (mesh.rotation.y > rotation) {
                rotation += Math.PI * 2;
            }
            else {
                rotation -= Math.PI * 2;
            }
        }

        const disposed$ = new Observable<void>(subscriber => {
            const observer = mesh.onDisposeObservable.add(() => subscriber.next());
            return () => {
                mesh.onDisposeObservable.remove(observer);
            };
        });
        return Anim.tween(mesh.rotation.y, rotation, (Math.abs(rotation - mesh.rotation.y) / velocity) * 1000).pipe(takeUntil(disposed$)).subscribe(v => {
            mesh.rotation.set(0, v, 0);
            mesh.rotationQuaternion = null;
        });
    }
}
