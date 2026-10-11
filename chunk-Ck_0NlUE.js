import{t as e}from"./chunk-CgQDO-0U.js";import{t as a}from"./chunk-D1JD_bZf.js";var t=`rgbdDecodePixelShader`;var n=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(fromRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV)),1.0);}`;e.ShadersStoreWGSL[t]||(e.ShadersStoreWGSL[t]=n);var S=[a];for(let r of S)e.IncludesShadersStoreWGSL[r.name]||(e.IncludesShadersStoreWGSL[r.name]=r.shader);var s={name:t,shader:n};export{s as rgbdDecodePixelShaderWGSL};