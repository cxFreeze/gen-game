import{S as e}from"./index-DRV1X7hE.js";const t="fogVertex",r=`#ifdef FOG
vertexOutputs.vFogDistance=(scene.view*worldPos).xyz;
#endif
`;e.IncludesShadersStoreWGSL[t]=r;const o="vertexColorMixing",s=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
vertexOutputs.vColor=vec4f(1.0);
#ifdef VERTEXCOLOR
#ifdef VERTEXALPHA
vertexOutputs.vColor*=vertexInputs.color;
#else
vertexOutputs.vColor=vec4f(vertexOutputs.vColor.rgb*vertexInputs.color.rgb,vertexOutputs.vColor.a);
#endif
#endif
#ifdef INSTANCESCOLOR
vertexOutputs.vColor*=vertexInputs.instanceColor;
#endif
#endif
`;e.IncludesShadersStoreWGSL[o]=s;
