// Entry point: scene setup, animation loop, and wiring modules
import * as THREE from "three";
import { createNodes, createEdges, updateNodePositions } from "./nodes.js";
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
  NODE_RADIUS,
} from "./constants.js";

const scene = new THREE.Scene();
// Add exponential fog to the scene
scene.fog = new THREE.FogExp2(0xb8c6db, 0.035);

const camera = createCamera();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = "fixed"; // Ensure canvas is fixed
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
renderer.domElement.style.zIndex = "1"; // Lower than the note panel
document.body.appendChild(renderer.domElement);

// Create nodes and edges
const { nodes, nodeConnections, nodeLabels, nodeLabelMeshes } =
  createNodes(scene);
const edges = createEdges(scene, nodes, nodeConnections);

// Note management system initialization
const nodeNotes = new Map();
let isPanelOpen = false;
let isTextareaFocused = false;
const notePanel = document.getElementById("notePanel");
const notePanelContent = notePanel.querySelector(".note-content");
const noNodeSelected = notePanel.querySelector(".no-node-selected");
const nodeNameSpan = notePanel.querySelector(".node-name");
const noteTextarea = notePanel.querySelector("textarea");

// Initialize state variables
let currentNode = nodes[0];
let currentConnectionIndex = -1;
let isTransitioning = false;
let transitionStartTime = 0;
let startPosition = new THREE.Vector3();
let targetPosition = new THREE.Vector3();
let startLookAt = new THREE.Vector3();
let targetLookAt = new THREE.Vector3();
const nodeHistory = [currentNode];
let historyIndex = 0;

// Update panel content when node changes
function updateNotePanel() {
  if (!currentNode) {
    notePanelContent.style.display = "none";
    noNodeSelected.style.display = "flex";
    return;
  }

  const nodeLabel = nodeLabels.get(currentNode);
  const notes = nodeNotes.get(nodeLabel) || "";

  notePanelContent.style.display = "block";
  noNodeSelected.style.display = "none";
  nodeNameSpan.textContent = nodeLabel;
  noteTextarea.value = notes;
}

// Toggle panel with space key
document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.repeat && !isTextareaFocused) {
    event.preventDefault(); // Prevent space from scrolling
    isPanelOpen = !isPanelOpen;
    notePanel.classList.toggle("open");
  }
});

// Save notes when textarea changes
noteTextarea.addEventListener("input", () => {
  if (currentNode) {
    const nodeLabel = nodeLabels.get(currentNode);
    nodeNotes.set(nodeLabel, noteTextarea.value);
  }
});

// Handle textarea focus/blur to toggle controls
noteTextarea.addEventListener("focus", () => {
  isTextareaFocused = true;
  // Disable controls
  window.removeEventListener("keydown", handleKeyDown);
  window.toggleWASDControls(false);
});

noteTextarea.addEventListener("blur", () => {
  isTextareaFocused = false;
  // Re-enable controls
  window.addEventListener("keydown", handleKeyDown);
  window.toggleWASDControls(true);
});

// Initialize with first node selected
updateColors();
updateNotePanel();

// Add lights
const ambientLight = new THREE.AmbientLight(COLOR_OTHER, 0.5);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(COLOR_OTHER, 1);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// Extract the keydown handler for controls
function handleKeyDown(event) {
  if (isTextareaFocused) return;

  const connections = nodeConnections.get(currentNode);
  if (!connections || connections.length === 0) return;

  switch (event.code) {
    case "ArrowLeft":
    case "ArrowRight":
      event.preventDefault();
      if (event.code === "ArrowLeft") {
        currentConnectionIndex = Math.max(-1, currentConnectionIndex - 1);
      } else {
        currentConnectionIndex = Math.min(
          connections.length - 1,
          currentConnectionIndex + 1
        );
      }
      updateColors();
      break;
    case "Enter":
      event.preventDefault();
      if (
        currentConnectionIndex >= 0 &&
        currentConnectionIndex < connections.length
      ) {
        const newNode = connections[currentConnectionIndex];
        nodeHistory.push(newNode);
        historyIndex = nodeHistory.length - 1;
        startCameraTransition(newNode);
        currentNode = newNode;
        currentConnectionIndex = -1;
        updateColors();
      }
      break;
    case "Backspace":
      event.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        const previousNode = nodeHistory[historyIndex];
        startCameraTransition(previousNode);
        currentNode = previousNode;
        currentConnectionIndex = -1;
        updateColors();
      }
      break;
  }
}

// Setup controls with the extracted handler
window.addEventListener("keydown", handleKeyDown);

function updateColors() {
  const connections = nodeConnections.get(currentNode);
  if (!connections || connections.length === 0) return;

  // Only use targetNode if we have a valid currentConnectionIndex
  const targetNode =
    currentConnectionIndex >= 0 ? connections[currentConnectionIndex] : null;

  nodes.forEach((node, index) => {
    const material = node.material;
    const isConnected = connections.includes(node);
    const labelSprite = nodeLabelMeshes[index];

    // Store original color if not already stored
    if (!node.userData.originalColor) {
      node.userData.originalColor = node.material.uniforms.color.value.clone();
    }

    if (node === currentNode) {
      // Current node appearance
      material.uniforms.isSelected.value = true;
      material.uniforms.isHighlighted.value = true;
      material.uniforms.emissiveIntensity.value = INTENSITY_CURRENT;
      material.uniforms.color.value = node.userData.originalColor;
      material.uniforms.outlineColor = {
        value: new THREE.Color(COLOR_FUTURE_OUTLINE),
      };
      // Scale up current node
      node.scale.copy(node.userData.largeScale);
      // Update label to large version
      labelSprite.material.map = labelSprite.userData.largeTexture;
      labelSprite.scale.copy(labelSprite.userData.largeScale);
    } else if (targetNode && node === targetNode) {
      material.uniforms.isSelected.value = false;
      material.uniforms.isHighlighted.value = true;
      material.uniforms.emissiveIntensity.value = INTENSITY_FUTURE;
      material.uniforms.color.value = node.userData.originalColor;
      material.uniforms.outlineColor = {
        value: new THREE.Color(COLOR_FUTURE_OUTLINE),
      };
      // Reset scale
      node.scale.copy(node.userData.originalScale);
      // Update label to small version
      labelSprite.material.map = labelSprite.userData.smallTexture;
      labelSprite.scale.copy(labelSprite.userData.smallScale);
    } else if (isConnected) {
      material.uniforms.isSelected.value = false;
      material.uniforms.isHighlighted.value = false;
      material.uniforms.emissiveIntensity.value = INTENSITY_OTHER;
      material.uniforms.color.value = node.userData.originalColor;
      // Reset scale
      node.scale.copy(node.userData.originalScale);
      // Update label to small version
      labelSprite.material.map = labelSprite.userData.smallTexture;
      labelSprite.scale.copy(labelSprite.userData.smallScale);
    } else {
      material.uniforms.isSelected.value = false;
      material.uniforms.isHighlighted.value = false;
      material.uniforms.emissiveIntensity.value = INTENSITY_UNCONNECTED;
      material.uniforms.color.value = new THREE.Color(COLOR_UNCONNECTED);
      // Reset scale
      node.scale.copy(node.userData.originalScale);
      // Update label to small version
      labelSprite.material.map = labelSprite.userData.smallTexture;
      labelSprite.scale.copy(labelSprite.userData.smallScale);
    }

    // Update label position to stay above node
    labelSprite.position.copy(node.position);
    labelSprite.position.y += NODE_RADIUS * node.scale.y + 0.5;
  });

  edges.forEach((edge) => {
    const isConnectedEdge =
      edge.startNode === currentNode || edge.endNode === currentNode;
    if (
      targetNode &&
      ((edge.startNode === currentNode && edge.endNode === targetNode) ||
        (edge.startNode === targetNode && edge.endNode === currentNode))
    ) {
      // Highlight the future edge
      edge.line.material.color.set(COLOR_EDGE_HIGHLIGHT);
      edge.line.material.opacity = 0; // Hide the thin line
      edge.tube.material.color.set(COLOR_EDGE_HIGHLIGHT);
      edge.tube.material.opacity = EDGE_OPACITY_HIGHLIGHT;
      edge.tube.visible = true; // Show the tube for thick edge
    } else if (isConnectedEdge) {
      edge.line.material.color.set(COLOR_EDGE_DEFAULT);
      edge.line.material.opacity = EDGE_OPACITY_DEFAULT;
      edge.tube.visible = false; // Hide the tube for regular edges
    } else {
      edge.line.material.color.set(COLOR_EDGE_UNCONNECTED);
      edge.line.material.opacity = EDGE_OPACITY_UNCONNECTED;
      edge.tube.visible = false; // Hide the tube for unconnected edges
    }
    // Update edge positions
    edge.updatePosition();
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

  if (currentConnectionIndex >= 0 && connections && connections.length > 0) {
    // If we have a future node selected, transition to look at it
    const targetNode = connections[currentConnectionIndex];
    targetPosition.copy(
      getOrbitCameraPosition(newNode, targetNode, CAMERA_HEIGHT, radius)
    );
    targetLookAt.copy(getLookAtPoint(newNode, targetNode, 1.0));
  } else {
    // If no future node is selected, position camera above current node
    targetPosition
      .copy(newNode.position)
      .add(new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_HEIGHT));
    targetLookAt.copy(newNode.position);
  }
}

function updateCamera() {
  const connections = nodeConnections.get(currentNode);
  if (!connections || connections.length === 0) return;

  if (!isTransitioning) {
    if (currentConnectionIndex >= 0) {
      // If we have a future node selected, look at it
      const targetNode = connections[currentConnectionIndex];
      const newPosition = getOrbitCameraPosition(
        currentNode,
        targetNode,
        CAMERA_HEIGHT,
        CAMERA_HEIGHT
      );
      camera.position.copy(newPosition);
      camera.lookAt(getLookAtPoint(currentNode, targetNode, 1.0));
    } else {
      // If no future node is selected, position camera above current node
      camera.position
        .copy(currentNode.position)
        .add(new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_HEIGHT));
      camera.lookAt(currentNode.position);
    }
  }
}

setupControls({
  getCurrentNode: () => currentNode,
  setCurrentNode: (node) => {
    currentNode = node;
    updateNotePanel();
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

  // Only update force-directed layout when textarea is not focused
  if (!isTextareaFocused) {
    updateNodePositions(nodes, nodeConnections, 0.016);
  }

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
    if (currentConnectionIndex >= 0 && connections && connections.length > 0) {
      const targetNode = connections[currentConnectionIndex];
      if (targetNode && currentNode) {
        const currentLookAt = new THREE.Vector3();
        currentLookAt.lerpVectors(
          startLookAt,
          getLookAtPoint(currentNode, targetNode, 1.0),
          easeProgress
        );
        camera.lookAt(currentLookAt);
      }
    } else if (currentNode) {
      // If no future node is selected, look at current node
      const currentLookAt = new THREE.Vector3();
      currentLookAt.lerpVectors(
        startLookAt,
        currentNode.position,
        easeProgress
      );
      camera.lookAt(currentLookAt);
    }

    if (progress === 1) {
      isTransitioning = false;
    }
  } else {
    const connections = nodeConnections.get(currentNode);
    if (currentConnectionIndex >= 0 && connections && connections.length > 0) {
      const targetNode = connections[currentConnectionIndex];
      if (targetNode && currentNode) {
        camera.lookAt(getLookAtPoint(currentNode, targetNode, 1.0));
      }
    } else if (currentNode) {
      camera.lookAt(currentNode.position);
    }
  }

  // Update node rotations and edge positions
  nodes.forEach((node) => {
    node.rotation.x += 0.01;
    node.rotation.y += 0.01;
  });
  edges.forEach((edge) => {
    edge.updatePosition();
  });

  // Update label positions to follow nodes
  nodeLabelMeshes.forEach((sprite, index) => {
    sprite.position.copy(nodes[index].position);
    sprite.position.y += NODE_RADIUS * nodes[index].scale.y + 0.5;
  });

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
