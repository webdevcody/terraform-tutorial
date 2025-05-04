// Keyboard controls and navigation history
// This module wires up navigation and history logic

export function setupControls({
  getCurrentNode,
  setCurrentNode,
  getConnections,
  getCurrentConnectionIndex,
  setCurrentConnectionIndex,
  nodeHistory,
  setHistoryIndex,
  startCameraTransition,
  updateColors,
}) {
  let isWASDEnabled = true;

  // Function to disable/enable WASD controls
  window.toggleWASDControls = (enabled) => {
    isWASDEnabled = enabled;
  };

  document.addEventListener("keydown", (event) => {
    // Get textarea focus state
    const isTextareaFocused = document.activeElement.tagName === "TEXTAREA";

    // If textarea is focused, don't handle any controls
    if (isTextareaFocused) {
      return;
    }

    const currentNode = getCurrentNode();
    const connections = getConnections(currentNode);
    if (!connections || connections.length === 0) return;
    window._lastKey = event.key;

    let currentConnectionIndex = getCurrentConnectionIndex();
    let newIndex;

    switch (event.code) {
      case "KeyW":
      case "KeyA":
      case "KeyS":
      case "KeyD":
        if (!isWASDEnabled) return;
        event.preventDefault();
        break;
    }

    switch (event.code) {
      case "KeyW":
        // Only proceed if we have a future node selected
        if (currentConnectionIndex >= 0) {
          const previousNode = currentNode;
          const targetNode = connections[currentConnectionIndex];
          setCurrentNode(targetNode);
          // Reset connection index when moving to new node
          setCurrentConnectionIndex(-1);
          nodeHistory.push(targetNode);
          setHistoryIndex(nodeHistory.length - 1);
          startCameraTransition(targetNode, false);
          updateColors();
        }
        break;
      case "KeyS":
        if (nodeHistory.length > 1) {
          nodeHistory.pop();
          const previousNode = nodeHistory[nodeHistory.length - 1];
          setCurrentNode(previousNode);
          // Reset connection index when moving to previous node
          setCurrentConnectionIndex(-1);
          setHistoryIndex(nodeHistory.length - 1);
          startCameraTransition(previousNode, false);
          updateColors();
        }
        break;
      case "KeyA":
        // If no connection is selected, start from the last connection
        newIndex =
          currentConnectionIndex < 0
            ? connections.length - 1
            : (currentConnectionIndex - 1 + connections.length) %
              connections.length;
        setCurrentConnectionIndex(newIndex);
        startCameraTransition(currentNode, true);
        updateColors();
        break;
      case "KeyD":
        // If no connection is selected, start from the first connection
        newIndex =
          currentConnectionIndex < 0
            ? 0
            : (currentConnectionIndex + 1) % connections.length;
        setCurrentConnectionIndex(newIndex);
        startCameraTransition(currentNode, true);
        updateColors();
        break;
    }
  });
}
