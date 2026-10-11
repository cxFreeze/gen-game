import{t as e}from"./chunk-CgQDO-0U.js";var d=`bumpVertexDeclaration`;var n=`#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL) 
varying mat3 vTBN;
#endif
#endif
`;e.IncludesShadersStore[d]||(e.IncludesShadersStore[d]=n);var r={name:d,shader:n};export{r as t};