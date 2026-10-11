import{t as e}from"./chunk-CgQDO-0U.js";var r=`passPixelShader`;var t=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);}`;e.ShadersStoreWGSL[r]||(e.ShadersStoreWGSL[r]=t);var S={name:r,shader:t};export{S as passPixelShaderWGSL};