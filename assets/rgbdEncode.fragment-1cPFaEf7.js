import{S as t}from"./index-DRV1X7hE.js";import"./helperFunctions-VH1AI26c.js";const e="rgbdEncodePixelShader",r=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=toRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV).rgb);}`;t.ShadersStoreWGSL[e]=r;const S={name:e,shader:r};export{S as rgbdEncodePixelShaderWGSL};
