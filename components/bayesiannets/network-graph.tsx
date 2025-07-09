"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Node {
  id: string;
  name: string;
  parents: string[];
  x: number;
  y: number;
}

interface NetworkGraphProps {
  network: {
    nodes: Node[];
    probabilities: Record<string, any>;
    evidence: Record<string, boolean>;
  };
  inferenceProbabilities: Record<string, { true: number; false: number }>;
  onSetEvidence: (nodeId: string, value: boolean | null) => void;
}

export default function NetworkGraph({
  network,
  inferenceProbabilities,
  onSetEvidence,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [svgDimensions, setSvgDimensions] = useState({
    width: 600,
    height: 500,
  });

  useEffect(() => {
    // Update SVG dimensions based on container size
    const updateSize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          setSvgDimensions({
            width: container.clientWidth,
            height: 500, // Fixed height, but you could make this dynamic as well
          });
        }
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    const node = network.nodes.find((n) => n.id === nodeId);
    if (node) {
      setDragging(nodeId);
      setOffset({
        x: e.clientX - node.x,
        y: e.clientY - node.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging && svgRef.current) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const newX = e.clientX - svgRect.left - offset.x;
      const newY = e.clientY - svgRect.top - offset.y;

      // Update node position
      const updatedNodes = network.nodes.map((node) => {
        if (node.id === dragging) {
          return { ...node, x: newX, y: newY };
        }
        return node;
      });

      // This would normally update the network state, but we're keeping this example simple
      // setNetwork({ ...network, nodes: updatedNodes })
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleEvidenceClick = (nodeId: string) => {
    const currentEvidence = network.evidence[nodeId];

    if (currentEvidence === undefined) {
      // No evidence -> set to true
      onSetEvidence(nodeId, true);
    } else if (currentEvidence === true) {
      // True -> set to false
      onSetEvidence(nodeId, false);
    } else {
      // False -> remove evidence
      onSetEvidence(nodeId, null);
    }
  };

  const getNodeColor = (nodeId: string) => {
    if (network.evidence[nodeId] === true)
      return "bg-green-100 border-green-500";
    if (network.evidence[nodeId] === false) return "bg-red-100 border-red-500";

    const probability = inferenceProbabilities[nodeId]?.true || 0.5;
    if (probability > 0.7) return "bg-green-50 border-green-300";
    if (probability < 0.3) return "bg-red-50 border-red-300";
    return "bg-gray-50 border-gray-300";
  };

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Bayesiaans Netwerk Diagram</h3>
        <p className="text-sm text-muted-foreground">
          Sleep de nodes om het diagram aan te passen. Klik op een node om
          evidence in te stellen.
        </p>
      </div>

      <div
        className="relative border rounded-md"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width={svgDimensions.width}
          height={svgDimensions.height}
          className="w-full"
          style={{ cursor: dragging ? "grabbing" : "default" }}
        >
          {/* Edges (pijlen) */}
          {network.nodes.map((node) =>
            node.parents.map((parentId) => {
              const parent = network.nodes.find((n) => n.id === parentId);
              if (!parent) return null;

              // Bereken de aansluitpunten voor de pijl
              const angle = Math.atan2(node.y - parent.y, node.x - parent.x);
              const nodeRadius = 45;

              const startX = parent.x + Math.cos(angle) * nodeRadius;
              const startY = parent.y + Math.sin(angle) * nodeRadius;
              const endX = node.x - Math.cos(angle) * nodeRadius;
              const endY = node.y - Math.sin(angle) * nodeRadius;

              // Bereken het middelpunt voor de pijlpunt
              const midX = endX - 10 * Math.cos(angle);
              const midY = endY - 10 * Math.sin(angle);

              // Bereken coördinaten voor de pijlpunt
              const arrowSize = 10;
              const arrowAngle = Math.PI / 6; // 30 graden
              const arrowPoint1X =
                midX + arrowSize * Math.cos(angle + Math.PI - arrowAngle);
              const arrowPoint1Y =
                midY + arrowSize * Math.sin(angle + Math.PI - arrowAngle);
              const arrowPoint2X =
                midX + arrowSize * Math.cos(angle + Math.PI + arrowAngle);
              const arrowPoint2Y =
                midY + arrowSize * Math.sin(angle + Math.PI + arrowAngle);

              return (
                <g key={`${parentId}-${node.id}`}>
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke="black"
                    strokeWidth={2}
                    strokeOpacity={0.7}
                  />
                  <polygon
                    points={`${endX},${endY} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
                    fill="black"
                    opacity={0.7}
                  />
                </g>
              );
            })
          )}

          {/* Nodes (transparante zones voor drag & drop) */}
          {network.nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x - 45}, ${node.y - 45})`}
            >
              <circle
                r="45"
                cx="45"
                cy="45"
                fill="transparent"
                onMouseDown={(e) => handleMouseDown(node.id, e)}
                style={{ cursor: dragging === node.id ? "grabbing" : "grab" }}
              />
            </g>
          ))}
        </svg>

        {/* HTML-elementen voor de nodes */}
        {network.nodes.map((node) => {
          const probability = inferenceProbabilities[node.id]?.true || 0.5;
          const hasEvidence = network.evidence[node.id] !== undefined;

          return (
            <div
              key={node.id}
              className={`absolute w-[90px] h-[90px] transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${getNodeColor(
                node.id
              )} flex flex-col items-center justify-center p-1 shadow-sm transition-colors duration-200`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                pointerEvents: "none", // Om te voorkomen dat deze div de svg events blokkeert
              }}
              onClick={() => handleEvidenceClick(node.id)}
            >
              <span className="font-medium text-sm">{node.name}</span>

              {hasEvidence ? (
                <Badge
                  variant="outline"
                  className={
                    network.evidence[node.id] ? "bg-green-200" : "bg-red-200"
                  }
                >
                  {network.evidence[node.id] ? "Waar" : "Onwaar"}
                </Badge>
              ) : (
                <div className="text-xs text-muted-foreground">
                  P(waar) = {probability.toFixed(2)}
                </div>
              )}
            </div>
          );
        })}

        {/* Klikbare zones bovenop de nodes */}
        {network.nodes.map((node) => (
          <div
            key={`clickzone-${node.id}`}
            className="absolute w-[90px] h-[90px] rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              zIndex: 10,
            }}
            onClick={() => handleEvidenceClick(node.id)}
          />
        ))}
      </div>

      <div className="mt-4 text-sm">
        <p className="mb-2">Evidence instellen:</p>
        <div className="flex gap-2 flex-wrap">
          {network.nodes.map((node) => (
            <Badge
              key={node.id}
              variant={
                network.evidence[node.id] !== undefined ? "default" : "outline"
              }
              className="cursor-pointer"
              onClick={() => handleEvidenceClick(node.id)}
            >
              {node.name}:{" "}
              {network.evidence[node.id] === undefined
                ? "?"
                : network.evidence[node.id]
                ? "Waar"
                : "Onwaar"}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
