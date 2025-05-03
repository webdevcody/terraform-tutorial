// Camera positioning, transitions, and lookAt logic
import * as THREE from "three";

export const CAMERA_HEIGHT = 10;
export const CAMERA_FOV = 75;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 1000;
export const NODE_TRANSITION_DURATION = 500;
export const ROTATION_TRANSITION_DURATION = 50;

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    CAMERA_NEAR,
    CAMERA_FAR
  );
  camera.position.z = CAMERA_HEIGHT + 5;
  return camera;
}

export function getOrbitCameraPosition(
  currentNode,
  targetNode,
  height,
  radius
) {
  // Calculate vector from current to target node
  const direction = new THREE.Vector3().subVectors(
    targetNode.position,
    currentNode.position
  );

  // Calculate distance between nodes
  const distance = direction.length();

  // Normalize direction for further calculations
  direction.normalize();

  // Position camera behind and above current node
  // Use a dynamic radius based on distance between nodes
  const dynamicRadius = Math.max(radius, distance * 0.75);

  return new THREE.Vector3()
    .copy(currentNode.position)
    .addScaledVector(direction, -dynamicRadius)
    .add(new THREE.Vector3(0, height, 0));
}

export function getLookAtPoint(currentNode, targetNode, offset = 1.0) {
  // Calculate midpoint between current and target nodes
  const midpoint = new THREE.Vector3()
    .addVectors(currentNode.position, targetNode.position)
    .multiplyScalar(0.5);

  // Slightly bias towards the current node
  return new THREE.Vector3().copy(midpoint).lerp(currentNode.position, 0.3);
}

// Transition and update logic will be wired up in index.js
