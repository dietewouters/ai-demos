"use client";

import type { NetworkNode } from "./network-types";

interface NetworkNodeProps {
  node: NetworkNode; // Type is nu NetworkNode
  isEvidence: boolean;
  isTarget: boolean;
  isDSeparated: boolean;
  isInActivePath: boolean;
  isBlockingNode: boolean;
  onToggleEvidence: (nodeId: string) => void;
  onSetTarget: (nodeId: string) => void;
}

export function PathNode({
  node,
  isEvidence,
  isTarget,
  isDSeparated,
  isInActivePath,
  isBlockingNode,
  onToggleEvidence,
  onSetTarget,
}: NetworkNodeProps) {
  const getNodeColor = () => {
    if (isTarget) return "bg-blue-500 text-white border-blue-600";
    if (isEvidence) return "bg-green-500 text-white border-green-600";
    if (isBlockingNode) return "bg-orange-500 text-white border-orange-600";
    if (isDSeparated) return "bg-red-200 text-red-800 border-red-400";
    if (isInActivePath)
      return "bg-yellow-200 text-yellow-800 border-yellow-400";
    return "bg-gray-200 text-gray-800 border-gray-400";
  };

  const getBorderStyle = () => {
    if (isInActivePath) return "border-4";
    return "border-2";
  };

  return (
    <div
      className={`absolute w-16 h-16 rounded-full ${getBorderStyle()} border-gray-400 flex items-center justify-center cursor-pointer font-semibold text-sm ${getNodeColor()}`}
      style={{ left: node.x - 32, top: node.y - 32 }}
      onClick={(e) => {
        if (e.shiftKey) {
          onToggleEvidence(node.id);
        } else {
          onSetTarget(node.id);
        }
      }}
      title={`${node.name} - ${
        isBlockingNode
          ? "This node is the blocking node for the highlighted path"
          : "Click to set as target or analyze paths, Shift+Click to toggle evidence"
      }`}
    >
      {node.name}
    </div>
  );
}
