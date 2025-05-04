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
} from "./constants.js";

// Physics constants for force-directed layout
const REPULSION_STRENGTH = 100;
const SPRING_STRENGTH = 0.03;
const DAMPING = 0.95;
const MIN_DISTANCE = 3;
const CENTER_GRAVITY = 0.05;

// Define specific node structure
const NODE_STRUCTURE = {
  nodes: [
    "WDC",
    "Begginer React Challenges",
    "Site Sherpa",
    "YouTube",
    "Project Planner AI",
    "The Video Crafter",
    "WDC Starter Kit",
    "Booksmith",
    "Icon Generator AI",
    "Github",
    "Deployment",
  ],
  connections: [
    ["WDC", "Begginer React Challenges"],
    ["WDC", "Site Sherpa"],
    ["WDC", "YouTube"],
    ["WDC", "Project Planner AI"],
    ["WDC", "The Video Crafter"],
    ["WDC", "WDC Starter Kit"],
    ["WDC", "Booksmith"],
    ["WDC", "Icon Generator AI"],
    ["Site Sherpa", "Github"],
    ["Site Sherpa", "Deployment"],
  ],
};

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

export function createNodes(scene) {
  const nodes = [];
  const nodeConnections = new Map();
  const nodeLabels = new Map();
  const nodeLabelMeshes = []; // Store label meshes for billboarding
  const nodeMap = new Map(); // Map to store node references by label

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

      // Style and draw the text
      context.font = `${fontSize}px Arial`;
      context.fillStyle = color;
      context.textBaseline = "top";
      context.fillText(label, 0, 0);

      return canvas;
    };

    // Create both small and large versions of the label
    const smallCanvas = createLabelSprite(48, "white");
    const largeCanvas = createLabelSprite(64, "#00ff00");

    const smallTexture = new THREE.CanvasTexture(smallCanvas);
    const largeTexture = new THREE.CanvasTexture(largeCanvas);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: smallTexture,
      sizeAttenuation: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set((0.05 * smallCanvas.width) / smallCanvas.height, 0.05, 1);
    sprite.position.copy(node.position);
    sprite.position.y += NODE_RADIUS + 0.5;

    sprite.userData.smallTexture = smallTexture;
    sprite.userData.largeTexture = largeTexture;
    sprite.userData.smallScale = sprite.scale.clone();
    sprite.userData.largeScale = sprite.scale.clone().multiplyScalar(1.3);

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

export function createEdges(scene, nodes, nodeConnections) {
  const edges = [];

  // Create edges only for specified connections
  nodeConnections.forEach((connectedNodes, startNode) => {
    connectedNodes.forEach((endNode) => {
      // Only create edge if we haven't created it yet (avoid duplicates)
      if (
        !edges.some(
          (edge) =>
            (edge.startNode === startNode && edge.endNode === endNode) ||
            (edge.startNode === endNode && edge.endNode === startNode)
        )
      ) {
        // Create a curve for the edge
        const points = [startNode.position, endNode.position];
        const curve = new THREE.LineCurve3(
          new THREE.Vector3(
            startNode.position.x,
            startNode.position.y,
            startNode.position.z
          ),
          new THREE.Vector3(
            endNode.position.x,
            endNode.position.y,
            endNode.position.z
          )
        );

        // Create tube geometry for thick lines
        const tubeGeometry = new THREE.TubeGeometry(curve, 1, 0.05, 8, false);
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.3,
        });

        const tube = new THREE.Mesh(tubeGeometry, material);
        scene.add(tube);

        // Also keep a basic line for very thin edges
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.3,
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);

        edges.push({
          line,
          tube,
          startNode,
          endNode,
          updatePosition: () => {
            // Update tube geometry
            const newCurve = new THREE.LineCurve3(
              new THREE.Vector3(
                startNode.position.x,
                startNode.position.y,
                startNode.position.z
              ),
              new THREE.Vector3(
                endNode.position.x,
                endNode.position.y,
                endNode.position.z
              )
            );
            tube.geometry = new THREE.TubeGeometry(newCurve, 1, 0.05, 8, false);

            // Update line geometry
            const positions = line.geometry.attributes.position.array;
            positions[0] = startNode.position.x;
            positions[1] = startNode.position.y;
            positions[2] = startNode.position.z;
            positions[3] = endNode.position.x;
            positions[4] = endNode.position.y;
            positions[5] = endNode.position.z;
            line.geometry.attributes.position.needsUpdate = true;
          },
        });
      }
    });
  });

  return edges;
}
