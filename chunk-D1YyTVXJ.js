import{t as e$1}from"./chunk-CgQDO-0U.js";var e=`packingFunctions`;var c=`fn pack(depth: f32)->vec4f
{const bit_shift: vec4f= vec4f(255.0*255.0*255.0,255.0*255.0,255.0,1.0);const bit_mask: vec4f= vec4f(0.0,1.0/255.0,1.0/255.0,1.0/255.0);var res: vec4f=fract(depth*bit_shift);res-=res.xxyz*bit_mask;return res;}
fn unpack(color: vec4f)->f32
{const bit_shift: vec4f= vec4f(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);return dot(color,bit_shift);}`;e$1.IncludesShadersStoreWGSL[e]||(e$1.IncludesShadersStoreWGSL[e]=c);var r={name:e,shader:c};export{r as t};