import{t as e}from"./chunk-CgQDO-0U.js";var r=`shadowMapFragmentSoftTransparentShadow`;var o=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(((fragmentInputs.position.xy)%(8.0)))))/64.0>=uniforms.softTransparentShadowSM.x*alpha) {discard;}
#endif
`;e.IncludesShadersStoreWGSL[r]||(e.IncludesShadersStoreWGSL[r]=o);var t={name:r,shader:o};export{t as shadowMapFragmentSoftTransparentShadowWGSL};