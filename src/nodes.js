// Node and edge creation, connection logic
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { nodeVertexShader, nodeFragmentShader } from "./shaders.js";
import {
  NODE_COUNT,
  NODE_RADIUS,
  NODE_SPHERE_SEGMENTS,
  NODE_SPREAD_RADIUS,
  CONNECTION_PROBABILITY,
  COLOR_FUTURE_OUTLINE,
} from "./constants.js";

// Generate random labels
const generateRandomLabel = () => {
  const labels = [
    "Alpha",
    "Beta",
    "Gamma",
    "Delta",
    "Epsilon",
    "Zeta",
    "Eta",
    "Theta",
    "Iota",
    "Kappa",
    "Lambda",
    "Mu",
    "Nu",
    "Xi",
    "Omicron",
    "Pi",
    "Rho",
    "Sigma",
    "Tau",
    "Upsilon",
    "Phi",
    "Chi",
    "Psi",
    "Omega",
  ];
  return labels[Math.floor(Math.random() * labels.length)];
};

// Generate random color
const generateRandomColor = () => {
  return new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
};

export function createNodes(scene) {
  const nodes = [];
  const nodeConnections = new Map();
  const nodeLabels = new Map();
  const nodeLabelMeshes = []; // Store label meshes for billboarding

  // Create font loader for labels
  const loader = new FontLoader();
  const fontPromise = new Promise((resolve) => {
    loader.load(
      "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
      resolve
    );
  });

  for (let i = 0; i < NODE_COUNT; i++) {
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
    const radius = NODE_SPREAD_RADIUS;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    node.position.x = radius * Math.sin(phi) * Math.cos(theta);
    node.position.y = radius * Math.sin(phi) * Math.sin(theta);
    node.position.z = radius * Math.cos(phi);
    scene.add(node);
    nodes.push(node);
    nodeConnections.set(node, []);

    // Create label
    const label = generateRandomLabel();
    nodeLabels.set(node, label);

    // Create sprite label
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const fontSize = 48;
    context.font = `${fontSize}px Arial`;

    // Get text metrics
    const metrics = context.measureText(label);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // Size the canvas to fit the text
    canvas.width = textWidth;
    canvas.height = textHeight;

    // Style and draw the text
    context.font = `${fontSize}px Arial`; // Need to set font again after resizing canvas
    context.fillStyle = "white";
    context.textBaseline = "top";
    context.fillText(label, 0, 0);

    // Create sprite
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      sizeAttenuation: false, // Makes the sprite size constant regardless of distance
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set((0.05 * canvas.width) / canvas.height, 0.05, 1);
    sprite.position.copy(node.position);
    sprite.position.y += NODE_RADIUS + 0.5; // Position above node

    scene.add(sprite);
    nodeLabelMeshes.push(sprite);
  }
  return { nodes, nodeConnections, nodeLabels, nodeLabelMeshes };
}

export function createEdges(scene, nodes, nodeConnections) {
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
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
          color: 0xffffff,
          transparent: true,
          opacity: 0.3,
        });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        edges.push({ line, startNode: nodes[i], endNode: nodes[j] });
        nodeConnections.get(nodes[i]).push(nodes[j]);
        nodeConnections.get(nodes[j]).push(nodes[i]);
      }
    }
  }
  return edges;
}
