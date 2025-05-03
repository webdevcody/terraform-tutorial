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
  document.addEventListener("keydown", (event) => {
    const currentNode = getCurrentNode();
    const connections = getConnections(currentNode);
    if (!connections || connections.length === 0) return;
    window._lastKey = event.key;

    if (event.key === "w" || event.key === "W") {
      // Only proceed if we have a future node selected
      const connectionIndex = getCurrentConnectionIndex();
      if (connectionIndex >= 0) {
        const previousNode = currentNode;
        const targetNode = connections[connectionIndex];
        setCurrentNode(targetNode);
        // Reset connection index when moving to new node
        setCurrentConnectionIndex(-1);
        nodeHistory.push(targetNode);
        setHistoryIndex(nodeHistory.length - 1);
        startCameraTransition(targetNode, false);
        updateColors();
      }
    } else if (event.key === "s" || event.key === "S") {
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
    } else if (event.key === "a" || event.key === "A") {
      const currentIndex = getCurrentConnectionIndex();
      // If no connection is selected, start from the last connection
      const newIndex =
        currentIndex < 0
          ? connections.length - 1
          : (currentIndex - 1 + connections.length) % connections.length;
      setCurrentConnectionIndex(newIndex);
      startCameraTransition(currentNode, true);
      updateColors();
    } else if (event.key === "d" || event.key === "D") {
      const currentIndex = getCurrentConnectionIndex();
      // If no connection is selected, start from the first connection
      const newIndex =
        currentIndex < 0 ? 0 : (currentIndex + 1) % connections.length;
      setCurrentConnectionIndex(newIndex);
      startCameraTransition(currentNode, true);
      updateColors();
    }
  });
}
