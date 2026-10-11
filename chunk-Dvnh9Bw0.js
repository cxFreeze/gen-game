import{t as e}from"./chunk-CgQDO-0U.js";var t=`logDepthVertex`;var o=`#ifdef LOGARITHMICDEPTH
vFragmentDepth=1.0+gl_Position.w;gl_Position.z=log2(max(0.000001,vFragmentDepth))*logarithmicDepthConstant;
#endif
`;e.IncludesShadersStore[t]||(e.IncludesShadersStore[t]=o);var n={name:t,shader:o};export{n as t};