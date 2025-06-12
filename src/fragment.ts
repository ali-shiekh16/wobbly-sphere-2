const fragment = `
varying float vPattern;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uGradientStrength;
uniform sampler2D uBaseTexture;

void main() {
    vec4 textureColor = texture2D(uBaseTexture, vUv);
    
    csm_DiffuseColor = textureColor;
}
`;

export default fragment;
