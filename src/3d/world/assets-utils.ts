import { AbstractMesh, Vector3 } from '@babylonjs/core';
import { Anim } from '../../utils/anim.js';


export abstract class MeshUtils {

    static rotateMeshY(mesh: AbstractMesh, rotation: number, velocity: number) {

        if (mesh.rotation.y === rotation) {
            return;
        }

        if (mesh.rotation.y > Math.PI) {
            mesh.rotation = new Vector3(0, mesh.rotation.y - 2 * Math.PI, 0);
        }
        else if (mesh.rotation.y < -Math.PI) {
            mesh.rotation = new Vector3(0, mesh.rotation.y + 2 * Math.PI, 0);
        }

        if (Math.abs(mesh.rotation.y - rotation) > Math.PI) {
            if (mesh.rotation.y > rotation) {
                rotation += Math.PI * 2;
            }
            else {
                rotation -= Math.PI * 2;
            }
        }

        return Anim.tween(mesh.rotation.y, rotation, (Math.abs(rotation - mesh.rotation.y) / velocity) * 1000).subscribe(v => {
            mesh.rotation = new Vector3(0, v, 0);
        });
    }
}