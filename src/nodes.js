// Node and edge creation, connection logic
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { nodeVertexShader, nodeFragmentShader } from "./shaders.js";
import {
  NODE_RADIUS,
  NODE_SPHERE_SEGMENTS,
  NODE_SPREAD_RADIUS,
  COLOR_FUTURE_OUTLINE,
  COLOR_CURRENT_LABEL,
  COLOR_FUTURE_LABEL,
} from "./constants.js";

// Physics constants for force-directed layout
const REPULSION_STRENGTH = 100;
const SPRING_STRENGTH = 0.03;
const DAMPING = 0.95;
const MIN_DISTANCE = 3;
const CENTER_GRAVITY = 0.05;

// Define specific node structure
async function fetchNodeStructure() {
  try {
    const hostname = window.location.hostname;
    const response = await fetch(`https://api.${hostname}/api/nodes`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching node structure:", error);
    // Return a minimal structure as fallback
    return {
      nodes: ["WDC"],
      connections: [],
    };
  }
}

// Generate random color
const generateRandomColor = () => {
  return new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
};

// Helper function to calculate forces
function calculateForces(nodes, nodeConnections) {
  // Initialize forces
  const forces = new Map(nodes.map((node) => [node, new THREE.Vector3()]));

  // Calculate repulsion forces between all nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      const diff = new THREE.Vector3().subVectors(
        nodeA.position,
        nodeB.position
      );
      const distance = diff.length();

      if (distance < MIN_DISTANCE) {
        // Add small random offset to prevent nodes from stacking exactly
        diff.add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
          )
        );
      }

      // Calculate repulsion force (inverse square law)
      const repulsionForce = diff
        .normalize()
        .multiplyScalar(REPULSION_STRENGTH / (distance * distance + 1));

      forces.get(nodeA).add(repulsionForce);
      forces.get(nodeB).sub(repulsionForce);
    }
  }

  // Calculate spring forces for connected nodes
  nodeConnections.forEach((connectedNodes, node) => {
    connectedNodes.forEach((connectedNode) => {
      const diff = new THREE.Vector3().subVectors(
        connectedNode.position,
        node.position
      );
      const distance = diff.length();

      // Spring force (Hooke's law)
      const springForce = diff
        .normalize()
        .multiplyScalar(distance * SPRING_STRENGTH);

      forces.get(node).add(springForce);
      forces.get(connectedNode).sub(springForce);
    });
  });

  // Add center gravity force
  nodes.forEach((node) => {
    const toCenter = new THREE.Vector3().subVectors(
      new THREE.Vector3(0, node.position.y, 0),
      node.position
    );
    const centerForce = toCenter.multiplyScalar(CENTER_GRAVITY);
    forces.get(node).add(centerForce);
  });

  return forces;
}

// Add velocity property to nodes
function initializeNodePhysics(nodes) {
  nodes.forEach((node) => {
    node.userData.velocity = new THREE.Vector3();
  });
}

// Update node positions based on forces
export function updateNodePositions(nodes, nodeConnections, deltaTime) {
  const forces = calculateForces(nodes, nodeConnections);

  nodes.forEach((node) => {
    if (!node.userData.velocity) {
      node.userData.velocity = new THREE.Vector3();
    }

    // Apply force to velocity
    const force = forces.get(node);
    node.userData.velocity.add(force.multiplyScalar(deltaTime));

    // Apply damping
    node.userData.velocity.multiplyScalar(DAMPING);

    // Update position
    node.position.add(node.userData.velocity.clone().multiplyScalar(deltaTime));

    // Keep WDC node elevated
    if (node.userData.label === "WDC") {
      node.position.y = NODE_SPREAD_RADIUS * 0.5;
    }
  });
}

export async function createNodes(scene) {
  const nodes = [];
  const nodeConnections = new Map();
  const nodeLabels = new Map();
  const nodeLabelMeshes = []; // Store label meshes for billboarding
  const nodeMap = new Map(); // Map to store node references by label

  // Fetch node structure from API
  const NODE_STRUCTURE = await fetchNodeStructure();

  // Create font loader for labels
  const loader = new FontLoader();
  const fontPromise = new Promise((resolve) => {
    loader.load(
      "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
      resolve
    );
  });

  // Create nodes with specific labels
  for (let i = 0; i < NODE_STRUCTURE.nodes.length; i++) {
    const label = NODE_STRUCTURE.nodes[i];

    // Store original scale for size transitions
    const originalScale = new THREE.Vector3(1, 1, 1);
    const largeScale = new THREE.Vector3(1.5, 1.5, 1.5);

    const geometry = new THREE.SphereGeometry(
      NODE_RADIUS,
      NODE_SPHERE_SEGMENTS,
      NODE_SPHERE_SEGMENTS
    );

    const randomColor = generateRandomColor();
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: randomColor },
        outlineColor: { value: new THREE.Color(COLOR_FUTURE_OUTLINE) },
        emissiveIntensity: { value: 0.2 },
        outlineWidth: { value: 0.1 },
        outlineIntensity: { value: 1.0 },
        isSelected: { value: false },
        isHighlighted: { value: false },
      },
      vertexShader: nodeVertexShader,
      fragmentShader: nodeFragmentShader,
      transparent: true,
    });

    const node = new THREE.Mesh(geometry, material);
    node.userData.originalScale = originalScale.clone();
    node.userData.largeScale = largeScale.clone();

    // Position nodes in a circle for better visibility
    const angle = (i / NODE_STRUCTURE.nodes.length) * Math.PI * 2;
    const radius = NODE_SPREAD_RADIUS * 0.7; // Slightly smaller radius for better visibility
    node.position.x = radius * Math.cos(angle);
    node.position.y = label === "WDC" ? radius * 0.5 : 0; // Place WDC node higher
    node.position.z = radius * Math.sin(angle);

    scene.add(node);
    nodes.push(node);
    nodeConnections.set(node, []);
    nodeLabels.set(node, label);
    nodeMap.set(label, node);

    // Create sprite label with different sizes for current/non-current
    const createLabelSprite = (fontSize, color) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      context.font = `${fontSize}px Arial`;

      // Get text metrics
      const metrics = context.measureText(label);
      const textWidth = metrics.width;
      const textHeight = fontSize;

      // Size the canvas to fit the text
      canvas.width = textWidth;
      canvas.height = textHeight;

      // Clear the canvas with a transparent background
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Style and draw the text
      context.font = `${fontSize}px Arial`;
      context.fillStyle = color;
      context.textBaseline = "top";
      context.fillText(label, 0, 0);

      return canvas;
    };

    // Create both small and large versions of the label
    const smallCanvas = createLabelSprite(32, "rgba(255, 255, 255, 0.6)"); // Smaller size and more transparent for non-future nodes
    const currentCanvas = createLabelSprite(48, COLOR_CURRENT_LABEL); // Green for current node
    const futureCanvas = createLabelSprite(48, COLOR_FUTURE_LABEL); // Yellow for future nodes

    const smallTexture = new THREE.CanvasTexture(smallCanvas);
    const currentTexture = new THREE.CanvasTexture(currentCanvas);
    const futureTexture = new THREE.CanvasTexture(futureCanvas);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: smallTexture,
      transparent: true,
      sizeAttenuation: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(
      (0.035 * smallCanvas.width) / smallCanvas.height,
      0.035,
      1
    );
    sprite.position.copy(node.position);
    sprite.position.y += NODE_RADIUS + 0.5;

    sprite.userData.smallTexture = smallTexture;
    sprite.userData.currentTexture = currentTexture;
    sprite.userData.futureTexture = futureTexture;
    sprite.userData.smallScale = sprite.scale.clone();
    sprite.userData.largeScale = sprite.scale.clone().multiplyScalar(1.5);

    scene.add(sprite);
    nodeLabelMeshes.push(sprite);
  }

  // Create specific connections based on NODE_STRUCTURE
  NODE_STRUCTURE.connections.forEach(([fromLabel, toLabel]) => {
    const fromNode = nodeMap.get(fromLabel);
    const toNode = nodeMap.get(toLabel);
    if (fromNode && toNode) {
      nodeConnections.get(fromNode).push(toNode);
      nodeConnections.get(toNode).push(fromNode);
    }
  });

  // Initialize physics properties for nodes
  initializeNodePhysics(nodes);

  return { nodes, nodeConnections, nodeLabels, nodeLabelMeshes };
}

// Add these shader definitions at the top of the file
const edgeVertexShader = `
  uniform float linewidth;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const edgeFragmentShader = `
  uniform vec3 color;
  uniform float opacity;
  void main() {
    gl_FragColor = vec4(color, opacity);
  }
`;

export function createEdges(scene, nodes, nodeConnections) {
  const edges = [];

  nodeConnections.forEach((connectedNodes, startNode) => {
    connectedNodes.forEach((endNode) => {
      if (
        !edges.some(
          (edge) =>
            (edge.startNode === startNode && edge.endNode === endNode) ||
            (edge.startNode === endNode && edge.endNode === startNode)
        )
      ) {
        // Create line geometry
        const positions = new Float32Array([
          startNode.position.x,
          startNode.position.y,
          startNode.position.z,
          endNode.position.x,
          endNode.position.y,
          endNode.position.z,
        ]);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3)
        );

        // Create shader material for the edge
        const material = new THREE.ShaderMaterial({
          vertexShader: edgeVertexShader,
          fragmentShader: edgeFragmentShader,
          uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            opacity: { value: 0.8 },
            linewidth: { value: 2.0 },
          },
          transparent: true,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide,
        });

        // Create line segments for the edge
        const line = new THREE.LineSegments(geometry, material);
        line.renderOrder = 1;
        line.frustumCulled = false;
        scene.add(line);

        edges.push({
          line,
          startNode,
          endNode,
          updatePosition: () => {
            // Calculate direction for offset
            const direction = new THREE.Vector3()
              .subVectors(endNode.position, startNode.position)
              .normalize();

            // Apply small offset to prevent z-fighting
            const offsetStart = direction
              .clone()
              .multiplyScalar(NODE_RADIUS * 0.1);
            const offsetEnd = direction
              .clone()
              .multiplyScalar(-NODE_RADIUS * 0.1);

            // Update positions with offset
            const positions = line.geometry.attributes.position.array;
            positions[0] = startNode.position.x + offsetStart.x;
            positions[1] = startNode.position.y + offsetStart.y;
            positions[2] = startNode.position.z + offsetStart.z;
            positions[3] = endNode.position.x + offsetEnd.x;
            positions[4] = endNode.position.y + offsetEnd.y;
            positions[5] = endNode.position.z + offsetEnd.z;

            line.geometry.attributes.position.needsUpdate = true;
          },
        });
      }
    });
  });

  return edges;
}
