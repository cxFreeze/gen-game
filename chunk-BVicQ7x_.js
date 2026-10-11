import{t as e$1}from"./chunk-CgQDO-0U.js";var e=`logDepthVertex`;var r=`#ifdef LOGARITHMICDEPTH
vertexOutputs.vFragmentDepth=1.0+vertexOutputs.position.w;vertexOutputs.position.z=log2(max(0.000001,vertexOutputs.vFragmentDepth))*uniforms.logarithmicDepthConstant;
#endif
`;e$1.IncludesShadersStoreWGSL[e]||(e$1.IncludesShadersStoreWGSL[e]=r);var s={name:e,shader:r};export{s as t};