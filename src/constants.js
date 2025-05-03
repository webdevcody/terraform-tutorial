// Node appearance
export const NODE_COUNT = 13;
export const NODE_RADIUS = 0.7;
export const NODE_SPHERE_SEGMENTS = 32;
export const NODE_SPREAD_RADIUS = 10;
export const CONNECTION_PROBABILITY = 0.3;

// Node colors and intensities
export const COLOR_OTHER = 0xffffff; // White
export const COLOR_UNCONNECTED = 0x666666; // Gray for unconnected nodes
export const COLOR_FUTURE_OUTLINE = 0xff3300; // Bright orange-red for future node outline

// Node glow/emissive intensities
export const INTENSITY_CURRENT = 1.8;
export const INTENSITY_FUTURE = 1.8;
export const INTENSITY_OTHER = 0.2;
export const INTENSITY_UNCONNECTED = 0.1;

// Edge colors and opacities
export const COLOR_EDGE_DEFAULT = 0xffffff;
export const COLOR_EDGE_HIGHLIGHT = 0xffff00;
export const COLOR_EDGE_UNCONNECTED = 0x666666;
export const EDGE_OPACITY_DEFAULT = 0.5;
export const EDGE_OPACITY_HIGHLIGHT = 2.8;
export const EDGE_OPACITY_UNCONNECTED = 0.15;

// Camera and animation
export const CAMERA_HEIGHT = 10;
export const CAMERA_FOV = 75;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 1000;
export const NODE_TRANSITION_DURATION = 1000;
export const ROTATION_TRANSITION_DURATION = 500;
