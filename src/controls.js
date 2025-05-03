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
      const previousNode = currentNode;
      const targetNode = connections[getCurrentConnectionIndex()];
      setCurrentNode(targetNode);
      setCurrentConnectionIndex(0); // or logic to select next
      nodeHistory.push(targetNode);
      setHistoryIndex(nodeHistory.length - 1);
      startCameraTransition(targetNode, false);
      updateColors();
    } else if (event.key === "s" || event.key === "S") {
      if (nodeHistory.length > 1) {
        nodeHistory.pop();
        const previousNode = nodeHistory[nodeHistory.length - 1];
        setCurrentNode(previousNode);
        setCurrentConnectionIndex(0); // or logic to select previous
        setHistoryIndex(nodeHistory.length - 1);
        startCameraTransition(previousNode, false);
        updateColors();
      }
    } else if (event.key === "a" || event.key === "A") {
      setCurrentConnectionIndex(
        (getCurrentConnectionIndex() - 1 + connections.length) %
          connections.length
      );
      startCameraTransition(currentNode, true);
      updateColors();
    } else if (event.key === "d" || event.key === "D") {
      setCurrentConnectionIndex(
        (getCurrentConnectionIndex() + 1) % connections.length
      );
      startCameraTransition(currentNode, true);
      updateColors();
    }
  });
}
