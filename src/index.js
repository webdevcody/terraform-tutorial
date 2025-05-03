// Entry point: scene setup, animation loop, and wiring modules
import * as THREE from "three";
import { createNodes, createEdges } from "./nodes.js";
import {
  createCamera,
  getOrbitCameraPosition,
  getLookAtPoint,
} from "./camera.js";
import { setupControls } from "./controls.js";
import { easeInOut } from "./utils.js";
import {
  COLOR_OTHER,
  COLOR_UNCONNECTED,
  COLOR_FUTURE_OUTLINE,
  INTENSITY_CURRENT,
  INTENSITY_FUTURE,
  INTENSITY_OTHER,
  INTENSITY_UNCONNECTED,
  COLOR_EDGE_DEFAULT,
  COLOR_EDGE_HIGHLIGHT,
  COLOR_EDGE_UNCONNECTED,
  EDGE_OPACITY_DEFAULT,
  EDGE_OPACITY_HIGHLIGHT,
  EDGE_OPACITY_UNCONNECTED,
  CAMERA_HEIGHT,
  NODE_TRANSITION_DURATION,
  ROTATION_TRANSITION_DURATION,
} from "./constants.js";

const scene = new THREE.Scene();
// Add exponential fog to the scene
scene.fog = new THREE.FogExp2(0xb8c6db, 0.035);

const camera = createCamera();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create nodes and edges
const { nodes, nodeConnections, nodeLabelMeshes } = createNodes(scene);
const edges = createEdges(scene, nodes, nodeConnections);

// Add lights
const ambientLight = new THREE.AmbientLight(COLOR_OTHER, 0.5);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(COLOR_OTHER, 1);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// Camera control variables
let currentNode = nodes[0];
let currentConnectionIndex = 0;
const cameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, 0);
const nodeHistory = [currentNode];
let historyIndex = 0;
let isTransitioning = false;
let transitionStartTime = 0;
let startPosition = new THREE.Vector3();
let targetPosition = new THREE.Vector3();
let startLookAt = new THREE.Vector3();
let targetLookAt = new THREE.Vector3();

window._isTransitioning = () => isTransitioning;

function updateColors() {
  const connections = nodeConnections.get(currentNode);
  if (!connections || connections.length === 0) return;
  const targetNode = connections[currentConnectionIndex];

  nodes.forEach((node) => {
    const material = node.material;
    const isConnected = connections.includes(node);

    // Store original color if not already stored
    if (!node.userData.originalColor) {
      node.userData.originalColor = node.material.uniforms.color.value.clone();
    }

    if (node === currentNode) {
      material.uniforms.isSelected.value = true;
      material.uniforms.isHighlighted.value = false;
      material.uniforms.emissiveIntensity.value = INTENSITY_CURRENT;
      material.uniforms.color.value = node.userData.originalColor;
    } else if (node === targetNode) {
      material.uniforms.isSelected.value = false;
      material.uniforms.isHighlighted.value = true;
      material.uniforms.emissiveIntensity.value = INTENSITY_FUTURE;
      material.uniforms.color.value = node.userData.originalColor;
      // Set the outline color for the future node
      material.uniforms.outlineColor = {
        value: new THREE.Color(COLOR_FUTURE_OUTLINE),
      };
    } else if (isConnected) {
      material.uniforms.isSelected.value = false;
      material.uniforms.isHighlighted.value = false;
      material.uniforms.emissiveIntensity.value = INTENSITY_OTHER;
      material.uniforms.color.value = node.userData.originalColor;
    } else {
      material.uniforms.isSelected.value = false;
      material.uniforms.isHighlighted.value = false;
      material.uniforms.emissiveIntensity.value = INTENSITY_UNCONNECTED;
      material.uniforms.color.value = new THREE.Color(COLOR_UNCONNECTED);
    }
  });

  edges.forEach((edge) => {
    const isConnectedEdge =
      edge.startNode === currentNode || edge.endNode === currentNode;
    if (
      (edge.startNode === currentNode && edge.endNode === targetNode) ||
      (edge.startNode === targetNode && edge.endNode === currentNode)
    ) {
      edge.line.material.color.set(COLOR_EDGE_HIGHLIGHT);
      edge.line.material.opacity = EDGE_OPACITY_HIGHLIGHT;
    } else if (isConnectedEdge) {
      edge.line.material.color.set(COLOR_EDGE_DEFAULT);
      edge.line.material.opacity = EDGE_OPACITY_DEFAULT;
    } else {
      edge.line.material.color.set(COLOR_EDGE_UNCONNECTED);
      edge.line.material.opacity = EDGE_OPACITY_UNCONNECTED;
    }
  });
}

function startCameraTransition(newNode, isRotation = false) {
  if (!newNode) return;
  isTransitioning = true;
  transitionStartTime = Date.now();
  startPosition.copy(camera.position);
  startLookAt.copy(
    camera.getWorldDirection(new THREE.Vector3()).add(camera.position)
  );
  const connections = nodeConnections.get(newNode);
  const radius = CAMERA_HEIGHT;
  let targetNode = null;
  if (connections && connections.length > 0) {
    targetNode = connections[currentConnectionIndex];
  }
  if (targetNode) {
    targetPosition.copy(
      getOrbitCameraPosition(newNode, targetNode, CAMERA_HEIGHT, radius)
    );
    targetLookAt.copy(getLookAtPoint(newNode, targetNode, 1.0));
  } else {
    targetPosition.copy(newNode.position).add(cameraOffset);
    targetLookAt.copy(newNode.position);
  }
}

function updateCamera() {
  const connections = nodeConnections.get(currentNode);
  if (!connections || connections.length === 0) return;
  const targetNode = connections[currentConnectionIndex];
  if (!isTransitioning) {
    const newPosition = getOrbitCameraPosition(
      currentNode,
      targetNode,
      CAMERA_HEIGHT,
      CAMERA_HEIGHT
    );
    camera.position.copy(newPosition);
    camera.lookAt(getLookAtPoint(currentNode, targetNode, 1.0));
  }
}

setupControls({
  getCurrentNode: () => currentNode,
  setCurrentNode: (node) => {
    currentNode = node;
  },
  getConnections: (node) => nodeConnections.get(node),
  getCurrentConnectionIndex: () => currentConnectionIndex,
  setCurrentConnectionIndex: (idx) => {
    currentConnectionIndex = idx;
  },
  nodeHistory,
  setHistoryIndex: (idx) => {
    historyIndex = idx;
  },
  startCameraTransition,
  updateColors,
});

updateCamera();
updateColors();

function animate() {
  requestAnimationFrame(animate);
  if (isTransitioning) {
    const elapsed = Date.now() - transitionStartTime;
    const duration = targetPosition.equals(startPosition)
      ? ROTATION_TRANSITION_DURATION
      : NODE_TRANSITION_DURATION;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = easeInOut(progress);
    camera.position.lerpVectors(startPosition, targetPosition, easeProgress);

    // Calculate look-at point during transition
    const connections = nodeConnections.get(currentNode);
    if (connections && connections.length > 0) {
      const targetNode = connections[currentConnectionIndex];
      const currentLookAt = new THREE.Vector3();
      currentLookAt.lerpVectors(
        startLookAt,
        getLookAtPoint(currentNode, targetNode, 1.0),
        easeProgress
      );
      camera.lookAt(currentLookAt);
    } else {
      camera.lookAt(currentNode.position);
    }

    if (progress === 1) {
      isTransitioning = false;
    }
  } else {
    const connections = nodeConnections.get(currentNode);
    if (connections && connections.length > 0) {
      const targetNode = connections[currentConnectionIndex];
      camera.lookAt(getLookAtPoint(currentNode, targetNode, 1.0));
    } else {
      camera.lookAt(currentNode.position);
    }
  }

  // Update node rotations and edge positions
  nodes.forEach((node) => {
    node.rotation.x += 0.01;
    node.rotation.y += 0.01;
  });
  edges.forEach((edge) => {
    const positions = edge.line.geometry.attributes.position.array;
    positions[0] = edge.startNode.position.x;
    positions[1] = edge.startNode.position.y;
    positions[2] = edge.startNode.position.z;
    positions[3] = edge.endNode.position.x;
    positions[4] = edge.endNode.position.y;
    positions[5] = edge.endNode.position.z;
    edge.line.geometry.attributes.position.needsUpdate = true;
  });

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
