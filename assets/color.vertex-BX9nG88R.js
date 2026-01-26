import{S as n}from"./index-_bENCOre.js";import"./bakedVertexAnimation-BFJpsv2a.js";import"./clipPlaneVertex-BbxhKYl8.js";import"./fogVertexDeclaration-D8yKSg0Q.js";import"./instancesDeclaration-D6S2TNQy.js";import"./fogVertex-z4Y1w4RL.js";import"./vertexColorMixing-w5BV5nEA.js";const e="colorVertexShader",i=`attribute position: vec3f;
#ifdef VERTEXCOLOR
attribute color: vec4f;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#ifdef FOG
uniform view: mat4x4f;
#endif
#include<instancesDeclaration>
uniform viewProjection: mat4x4f;
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vColor: vec4f;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(input.position,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;
#include<clipPlaneVertex>
#include<fogVertex>
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}`;n.ShadersStoreWGSL[e]=i;const l={name:e,shader:i};export{l as colorVertexShaderWGSL};
