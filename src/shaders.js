// Shader code for node effects
export const nodeVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const nodeFragmentShader = `
uniform vec3 color;
uniform bool isSelected;
uniform bool isHighlighted;
uniform vec3 outlineColor;
uniform float emissiveIntensity;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = abs(dot(normal, viewDir));
    
    // Create stronger outline effect
    float outlineStrength = 1.0 - smoothstep(0.3, 0.7, fresnel);
    
    vec3 baseColor = color;
    vec3 finalColor = baseColor;
    
    // Add emissive glow
    finalColor += baseColor * emissiveIntensity;
    
    // Add outline for highlighted nodes
    if (isHighlighted) {
        // Mix with a stronger bias towards the outline color at edges
        finalColor = mix(outlineColor, finalColor, pow(fresnel, 1.5));
    }
    
    // Brighten selected nodes
    if (isSelected) {
        finalColor *= 1.5;  // Increased brightness
        // Add rim lighting effect for selected nodes
        float rim = 1.0 - fresnel;
        finalColor += outlineColor * pow(rim, 3.0) * 0.5;
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;
