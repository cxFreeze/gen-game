import{S as o}from"./index-mETwGfQ6.js";import"./helperFunctions-BCsUynrE.js";const e="rgbdEncodePixelShader",r=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);}`;o.ShadersStore[e]=r;const d={name:e,shader:r};export{d as rgbdEncodePixelShader};
