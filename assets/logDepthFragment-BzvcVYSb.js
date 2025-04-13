import{S as t}from"./index-CtMFCe-8.js";const e="logDepthFragment",r=`#ifdef LOGARITHMICDEPTH
fragmentOutputs.fragDepth=log2(fragmentInputs.vFragmentDepth)*uniforms.logarithmicDepthConstant*0.5;
#endif
`;t.IncludesShadersStoreWGSL[e]=r;
