import { Effect } from '@babylonjs/core';


export class ShadersManager {
    // Shaders

    public static loadShaders() {
        Effect.ShadersStore['customVertexShader'] = `
            precision highp float;

            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;
            attribute mat4 world0;

            uniform mat4 worldViewProjection;

            varying vec2 vUV;

            void main() {
                vec4 worldPosition = world0 * vec4(position, 1.0);
                gl_Position = worldViewProjection * worldPosition;
                vUV = uv;
            }
        `;

        Effect.ShadersStore['customFragmentShader'] = `
            precision highp float;

            varying vec2 vUV;

            uniform vec3 color;
            uniform float alpha;

            void main() {
                gl_FragColor = vec4(1,1,1,1);
            }
        `;
    }
}

