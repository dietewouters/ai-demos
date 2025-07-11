import type { NetworkNode } from "./network-types";

interface NetworkEdgeProps {
  from: NetworkNode; // Type is nu NetworkNode
  to: NetworkNode; // Type is nu NetworkNode
  isHighlighted?: boolean;
  isBlocked?: boolean;
  isPathSegment?: boolean;
  pathDirection?: "forward" | "backward";
  isBlockedFromHere?: boolean;
}

export function NetworkEdge({
  from,
  to,
  isHighlighted = false,
  isBlocked = false,
  isPathSegment = false,
  pathDirection,
  isBlockedFromHere = false,
}: NetworkEdgeProps) {
  // Calculate arrow position
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const unitX = dx / length;
  const unitY = dy / length;

  // Adjust for node radius (32px)
  const startX = from.x + unitX * 32;
  const startY = from.y + unitY * 32;
  const endX = to.x - unitX * 32;
  const endY = to.y - unitY * 32;

  let strokeColor = "#374151";
  let strokeWidth = isPathSegment ? "1" : "2"; // Smaller when showing paths
  let strokeDasharray = "none";
  const opacity = isPathSegment ? "0.3" : "1"; // More transparent when showing paths

  if (isPathSegment) {
    if (isBlockedFromHere) {
      strokeColor = "#DC2626"; // Red for blocked part
      strokeWidth = "4";
      strokeDasharray = "8,4"; // Dashed line
    } else {
      strokeColor = "#3B82F6"; // Blue for open part
      strokeWidth = "4";
    }
  } else if (isBlocked) {
    strokeColor = "#DC2626"; // Red for blocked
    strokeWidth = "3";
    strokeDasharray = "8,4"; // Dashed line
  } else if (isHighlighted) {
    strokeColor = "#3B82F6"; // Blue for highlighted
    strokeWidth = "4";
  }

  // Determine arrow direction based on path direction
  let arrowStartX = startX;
  let arrowStartY = startY;
  let arrowEndX = endX;
  let arrowEndY = endY;

  if (pathDirection === "backward") {
    // Reverse the arrow direction
    arrowStartX = endX;
    arrowStartY = endY;
    arrowEndX = startX;
    arrowEndY = startY;
  }

  return (
    <g>
      {/* Main edge line */}
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        opacity={opacity}
        markerEnd="url(#arrowhead)"
      />

      {/* Path direction arrow (if this is a path segment) */}
      {isPathSegment && pathDirection && (
        <g>
          {/* Path direction arrow */}
          <defs>
            <marker
              id={`pathArrow-${pathDirection}-${
                isBlockedFromHere ? "blocked" : "open"
              }`}
              markerWidth="12"
              markerHeight="8"
              refX="10"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 12 4, 0 8"
                fill={isBlockedFromHere ? "#DC2626" : "#3B82F6"}
                stroke={isBlockedFromHere ? "#DC2626" : "#3B82F6"}
                strokeWidth="1"
              />
            </marker>
          </defs>

          {/* Direction indicator line */}
          <line
            x1={arrowStartX}
            y1={arrowStartY}
            x2={arrowEndX}
            y2={arrowEndY}
            stroke={isBlockedFromHere ? "#DC2626" : "#3B82F6"}
            strokeWidth="2"
            markerEnd={`url(#pathArrow-${pathDirection}-${
              isBlockedFromHere ? "blocked" : "open"
            })`}
            opacity="0.8"
          />
        </g>
      )}

      {/* Blocked indicator */}
      {isBlocked && (
        <text
          x={(startX + endX) / 2}
          y={(startY + endY) / 2 - 10}
          fill="#DC2626"
          fontSize="12"
          textAnchor="middle"
          className="font-bold"
        >
          ✕
        </text>
      )}
    </g>
  );
}
