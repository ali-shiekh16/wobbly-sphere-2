const fragment = `
varying float vPattern;
uniform vec3 uColor;
uniform float uGradientStrength;

void main() {
    vec3 color = vPattern * uColor * uGradientStrength;
    
    csm_DiffuseColor = vec4(color, 1.0);
}
`;

export default fragment;
