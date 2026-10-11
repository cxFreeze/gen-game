import{t as e}from"./chunk-CgQDO-0U.js";var r=`shadowMapFragmentSoftTransparentShadow`;var o=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x*alpha) discard;
#endif
`;e.IncludesShadersStore[r]||(e.IncludesShadersStore[r]=o);var t={name:r,shader:o};export{t as shadowMapFragmentSoftTransparentShadow};