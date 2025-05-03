// === CONFIGURATION CONSTANTS ===
const NODE_COUNT = 13;
const NODE_RADIUS = 0.5;
const NODE_SPHERE_SEGMENTS = 32;
const NODE_SPREAD_RADIUS = 10; // Spread distance for starting nodes
const CONNECTION_PROBABILITY = 0.3;

// Node colors
const COLOR_CURRENT = 0x00ff00; // Green
const COLOR_FUTURE = 0xffff00; // Yellow
const COLOR_OTHER = 0xffffff; // White

// Node glow/emissive intensities
const INTENSITY_CURRENT = 0.8;
const INTENSITY_FUTURE = 0.8;
const INTENSITY_OTHER = 0.2;

// Edge colors
const COLOR_EDGE_DEFAULT = 0xffffff;
const COLOR_EDGE_HIGHLIGHT = 0xffff00;
const EDGE_OPACITY_DEFAULT = 0.3;
const EDGE_OPACITY_HIGHLIGHT = 0.8;

// Camera
const CAMERA_HEIGHT = 10;
const CAMERA_FOV = 75;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 1000;

// Animation durations (ms)
const NODE_TRANSITION_DURATION = 1000;
const ROTATION_TRANSITION_DURATION = 500;

// === END CONFIGURATION ===

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  CAMERA_FOV,
  window.innerWidth / window.innerHeight,
  CAMERA_NEAR,
  CAMERA_FAR
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Camera position
camera.position.z = CAMERA_HEIGHT + 5;

// Create nodes
const nodes = [];
const edges = [];
const nodeConnections = new Map(); // Track connections for each node

for (let i = 0; i < NODE_COUNT; i++) {
  // Create sphere geometry
  const geometry = new THREE.SphereGeometry(
    NODE_RADIUS,
    NODE_SPHERE_SEGMENTS,
    NODE_SPHERE_SEGMENTS
  );

  // Create white material with emissive property for glow effect
  const material = new THREE.MeshPhongMaterial({
    color: COLOR_OTHER,
    emissive: COLOR_OTHER,
    emissiveIntensity: INTENSITY_OTHER,
    shininess: 100,
  });

  const node = new THREE.Mesh(geometry, material);

  // Position the node randomly within a sphere of radius NODE_SPREAD_RADIUS
  const radius = NODE_SPREAD_RADIUS;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  node.position.x = radius * Math.sin(phi) * Math.cos(theta);
  node.position.y = radius * Math.sin(phi) * Math.sin(theta);
  node.position.z = radius * Math.cos(phi);

  scene.add(node);
  nodes.push(node);
  nodeConnections.set(node, []); // Initialize empty connections array
}

// Create random connections between nodes
for (let i = 0; i < NODE_COUNT; i++) {
  for (let j = i + 1; j < NODE_COUNT; j++) {
    // CONNECTION_PROBABILITY chance of connection between any two nodes
    if (Math.random() < CONNECTION_PROBABILITY) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        nodes[i].position.x,
        nodes[i].position.y,
        nodes[i].position.z,
        nodes[j].position.x,
        nodes[j].position.y,
        nodes[j].position.z,
      ]);
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );

      const material = new THREE.LineBasicMaterial({
        color: COLOR_EDGE_DEFAULT,
        transparent: true,
        opacity: EDGE_OPACITY_DEFAULT,
      });

      const line = new THREE.Line(geometry, material);
      scene.add(line);
      edges.push({
        line: line,
        startNode: nodes[i],
        endNode: nodes[j],
      });

      // Store connections in both directions
      nodeConnections.get(nodes[i]).push(nodes[j]);
      nodeConnections.get(nodes[j]).push(nodes[i]);
    }
  }
}

// Add lights
const ambientLight = new THREE.AmbientLight(COLOR_OTHER, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(COLOR_OTHER, 1);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// Camera control variables
let currentNode = nodes[0]; // Start with first node
let currentConnectionIndex = 0;
const cameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, 0); // Directly above

// Node history tracking
const nodeHistory = [currentNode];
let historyIndex = 0;

// Animation variables
let isTransitioning = false;
let transitionStartTime = 0;
let startPosition = new THREE.Vector3();
let targetPosition = new THREE.Vector3();
let startLookAt = new THREE.Vector3();
let targetLookAt = new THREE.Vector3();

// Helper: get camera position for orbiting so the highlighted future node is in front
function getOrbitCameraPosition(currentNode, targetNode, height, radius) {
  const direction = new THREE.Vector3()
    .subVectors(targetNode.position, currentNode.position)
    .normalize();
  return new THREE.Vector3()
    .copy(currentNode.position)
    .addScaledVector(direction, -radius)
    .add(new THREE.Vector3(0, height, 0));
}

// Function to select a different future node
function selectDifferentFutureNode(previousNode) {
  const connections = nodeConnections.get(currentNode);
  if (!connections || connections.length === 0) return 0;
  if (connections.length === 1) return 0;
  let newIndex = 0;
  for (let i = 0; i < connections.length; i++) {
    if (connections[i] !== previousNode) {
      newIndex = i;
      break;
    }
  }
  return newIndex;
}

// Function to update node and edge colors
function updateColors() {
  const connections = nodeConnections.get(currentNode);
  if (!connections || connections.length === 0) return;
  const targetNode = connections[currentConnectionIndex];
  nodes.forEach((node) => {
    if (node === currentNode) {
      node.material.color.set(COLOR_CURRENT);
      node.material.emissive.set(COLOR_CURRENT);
      node.material.emissiveIntensity = INTENSITY_CURRENT;
    } else if (node === targetNode) {
      node.material.color.set(COLOR_FUTURE);
      node.material.emissive.set(COLOR_FUTURE);
      node.material.emissiveIntensity = INTENSITY_FUTURE;
    } else {
      node.material.color.set(COLOR_OTHER);
      node.material.emissive.set(COLOR_OTHER);
      node.material.emissiveIntensity = INTENSITY_OTHER;
    }
  });
  edges.forEach((edge) => {
    if (
      (edge.startNode === currentNode && edge.endNode === targetNode) ||
      (edge.startNode === targetNode && edge.endNode === currentNode)
    ) {
      edge.line.material.color.set(COLOR_EDGE_HIGHLIGHT);
      edge.line.material.opacity = EDGE_OPACITY_HIGHLIGHT;
    } else {
      edge.line.material.color.set(COLOR_EDGE_DEFAULT);
      edge.line.material.opacity = EDGE_OPACITY_DEFAULT;
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
  if (isRotation || !isRotation) {
    if (targetNode) {
      targetPosition.copy(
        getOrbitCameraPosition(newNode, targetNode, CAMERA_HEIGHT, radius)
      );
      targetLookAt.copy(newNode.position); // Always look at green node
    } else {
      targetPosition.copy(newNode.position).add(cameraOffset);
      targetLookAt.copy(newNode.position);
    }
  }
}

function updateCamera() {
  const connections = nodeConnections.get(currentNode);
  if (!connections || connections.length === 0) return;
  currentConnectionIndex =
    (currentConnectionIndex + connections.length) % connections.length;
  if (!isTransitioning) {
    const targetNode = connections[currentConnectionIndex];
    camera.position.copy(
      getOrbitCameraPosition(
        currentNode,
        targetNode,
        CAMERA_HEIGHT,
        CAMERA_HEIGHT
      )
    );
    camera.lookAt(currentNode.position); // Always look at green node
  }
}

updateCamera();
updateColors();

document.addEventListener("keydown", (event) => {
  if (isTransitioning) return;
  const connections = nodeConnections.get(currentNode);
  if (!connections || connections.length === 0) return;
  window._lastKey = event.key;
  if (event.key === "w" || event.key === "W") {
    const previousNode = currentNode;
    const targetNode = connections[currentConnectionIndex];
    currentNode = targetNode;
    currentConnectionIndex = selectDifferentFutureNode(previousNode);
    nodeHistory.push(currentNode);
    historyIndex = nodeHistory.length - 1;
    startCameraTransition(currentNode, false);
    updateColors();
  } else if (event.key === "s" || event.key === "S") {
    if (historyIndex > 0) {
      const previousNode = currentNode;
      historyIndex--;
      currentNode = nodeHistory[historyIndex];
      currentConnectionIndex = selectDifferentFutureNode(previousNode);
      startCameraTransition(currentNode, false);
      updateColors();
    }
  } else if (event.key === "a" || event.key === "A") {
    currentConnectionIndex =
      (currentConnectionIndex - 1 + connections.length) % connections.length;
    startCameraTransition(currentNode, true);
    updateColors();
  } else if (event.key === "d" || event.key === "D") {
    currentConnectionIndex = (currentConnectionIndex + 1) % connections.length;
    startCameraTransition(currentNode, true);
    updateColors();
  }
});

function animate() {
  requestAnimationFrame(animate);
  if (isTransitioning) {
    const elapsed = Date.now() - transitionStartTime;
    const duration = targetPosition.equals(startPosition)
      ? ROTATION_TRANSITION_DURATION
      : NODE_TRANSITION_DURATION;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
    const currentLookAt = new THREE.Vector3();
    currentLookAt.lerpVectors(startLookAt, targetLookAt, easeProgress);
    camera.lookAt(currentNode.position); // Always look at green node
    if (progress === 1) {
      isTransitioning = false;
      updateCamera();
    }
  }
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
