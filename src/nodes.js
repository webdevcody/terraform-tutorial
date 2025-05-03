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
    const largeCanvas = createLabelSprite(64, "#00ff00"); // Bright green for current node

    // Create textures for both sizes
    const smallTexture = new THREE.CanvasTexture(smallCanvas);
    const largeTexture = new THREE.CanvasTexture(largeCanvas);

    // Create sprite material with small texture initially
    const spriteMaterial = new THREE.SpriteMaterial({
      map: smallTexture,
      sizeAttenuation: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set((0.05 * smallCanvas.width) / smallCanvas.height, 0.05, 1);
    sprite.position.copy(node.position);
    sprite.position.y += NODE_RADIUS + 0.5;

    // Store textures and scale info for later updates
    sprite.userData.smallTexture = smallTexture;
    sprite.userData.largeTexture = largeTexture;
    sprite.userData.smallScale = sprite.scale.clone();
    sprite.userData.largeScale = sprite.scale.clone().multiplyScalar(1.3);

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
        // Create a curve for the edge
        const points = [nodes[i].position, nodes[j].position];
        const curve = new THREE.LineCurve3(
          new THREE.Vector3(
            nodes[i].position.x,
            nodes[i].position.y,
            nodes[i].position.z
          ),
          new THREE.Vector3(
            nodes[j].position.x,
            nodes[j].position.y,
            nodes[j].position.z
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
          startNode: nodes[i],
          endNode: nodes[j],
          updatePosition: () => {
            // Update tube geometry
            const newCurve = new THREE.LineCurve3(
              new THREE.Vector3(
                nodes[i].position.x,
                nodes[i].position.y,
                nodes[i].position.z
              ),
              new THREE.Vector3(
                nodes[j].position.x,
                nodes[j].position.y,
                nodes[j].position.z
              )
            );
            tube.geometry = new THREE.TubeGeometry(newCurve, 1, 0.05, 8, false);

            // Update line geometry
            const positions = line.geometry.attributes.position.array;
            positions[0] = nodes[i].position.x;
            positions[1] = nodes[i].position.y;
            positions[2] = nodes[i].position.z;
            positions[3] = nodes[j].position.x;
            positions[4] = nodes[j].position.y;
            positions[5] = nodes[j].position.z;
            line.geometry.attributes.position.needsUpdate = true;
          },
        });

        nodeConnections.get(nodes[i]).push(nodes[j]);
        nodeConnections.get(nodes[j]).push(nodes[i]);
      }
    }
  }
  return edges;
}
