import{S as e}from"./index-_bENCOre.js";const o="fogVertex",r=`#ifdef FOG
vertexOutputs.vFogDistance=(scene.view*worldPos).xyz;
#endif
`;e.IncludesShadersStoreWGSL[o]=r;
