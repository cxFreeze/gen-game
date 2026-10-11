import{t as e}from"./chunk-CgQDO-0U.js";import{t as t$1}from"./chunk-CAIcALcr.js";var o=`rgbdDecodePixelShader`;var t=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;e.ShadersStore[o]||(e.ShadersStore[o]=t);var d=[t$1];for(let r of d)e.IncludesShadersStore[r.name]||(e.IncludesShadersStore[r.name]=r.shader);var s={name:o,shader:t};export{s as rgbdDecodePixelShader};