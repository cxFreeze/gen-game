import{t as e}from"./chunk-CgQDO-0U.js";import{bt as a,xt as s}from"./main-PYR53G4F.js";import{t as P$1}from"./chunk-Q0i7-REW.js";import{n as g,t as f}from"./chunk-DGq_rAwh.js";import{t}from"./chunk-KoAA4Ujj.js";import{t as a$1}from"./chunk-DonoV55g.js";import{t as t$1}from"./chunk-CAIcALcr.js";var i=`imageProcessingCompatibility`;var c=`#ifdef IMAGEPROCESSINGPOSTPROCESS
gl_FragColor.rgb=pow(gl_FragColor.rgb,vec3(2.2));
#endif
`;e.IncludesShadersStore[i]||(e.IncludesShadersStore[i]=c);var P={name:i,shader:c};var r=`spritesPixelShader`;var S=`#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
#include<prePassDeclaration>[SCENE_MRT_COUNT]
uniform bool alphaTest;varying vec4 vColor;
#ifdef PREPASS
uniform float geometryZeroAlphaDiscard;
#ifdef PREPASS_POSITION
varying vec3 vPositionW;
#endif
#ifdef PREPASS_NORMAL
varying vec3 vNormalV;
#endif
#ifdef PREPASS_WORLD_NORMAL
varying vec3 vNormalW;
#endif
#endif
varying vec2 vUV;uniform sampler2D diffuseSampler;
#include<fogFragmentDeclaration>
#include<logDepthDeclaration>
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
#ifdef PIXEL_PERFECT
vec2 uvPixelPerfect(vec2 uv) {vec2 res=vec2(textureSize(diffuseSampler,0));uv=uv*res;vec2 seam=floor(uv+0.5);uv=seam+clamp((uv-seam)/fwidth(uv),-0.5,0.5);return uv/res;}
#endif
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#ifdef PIXEL_PERFECT
vec2 uv=uvPixelPerfect(vUV);
#else
vec2 uv=vUV;
#endif
vec4 color=texture2D(diffuseSampler,uv);float fAlphaTest=float(alphaTest);if (fAlphaTest != 0.)
{if (color.a<0.95)
discard;}
color*=vColor;
#ifdef PREPASS
#if defined(PREPASS_ALBEDO) || defined(PREPASS_ALBEDO_SQRT)
vec3 geometryAlbedo=toLinearSpace(color.rgb);
#endif
if (fAlphaTest==0.0 && color.a==0.0 && geometryZeroAlphaDiscard>0.0) {discard;}
#endif
#include<logDepthFragment>
#include<fogFragment>
gl_FragColor=color;
#include<imageProcessingCompatibility>
#ifdef PREPASS
vec4 geometryColor=gl_FragColor;
#ifdef PREPASS_POSITION
vec3 geometryPositionW=vPositionW;
#endif
#ifdef PREPASS_LOCAL_POSITION
vec3 geometryPositionL=vPosition;
#endif
#ifdef PREPASS_DEPTH
float geometryViewDepth=vViewPos.z;
#endif
#ifdef PREPASS_NORMALIZED_VIEW_DEPTH
float geometryNormalizedViewDepth=vNormViewDepth;
#endif
#ifdef PREPASS_NORMAL
vec3 geometryNormalV=vNormalV;
#endif
#ifdef PREPASS_WORLD_NORMAL
vec3 geometryNormalW=vNormalW;
#endif
#if defined(PREPASS_VELOCITY) || defined(PREPASS_VELOCITY_LINEAR)
vec4 geometryCurrentPosition=vCurrentPosition;vec4 geometryPreviousPosition=vPreviousPosition;
#endif
#include<geometryRenderingFragment>
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}`;e.ShadersStore[r]||(e.ShadersStore[r]=S);var v=[t,f,a,a$1,t$1,g,s,P,P$1];for(let o of v)e.IncludesShadersStore[o.name]||(e.IncludesShadersStore[o.name]=o.shader);var O={name:r,shader:S};export{O as spritesPixelShader};