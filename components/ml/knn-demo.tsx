"use client";

import type React from "react";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Point {
  x: number;
  y: number;
  label: "blue" | "orange";
}

interface QueryPoint {
  x: number;
  y: number;
}

interface DistanceResult {
  point: Point;
  distance: number;
  index: number;
}

const INITIAL_POINTS: Point[] = [
  { x: 4, y: 1, label: "blue" },
  { x: 2, y: 5, label: "blue" },
  { x: 4, y: 7, label: "blue" },
  { x: 5, y: 3, label: "orange" },
  { x: 11, y: 2, label: "orange" },
  { x: 10, y: 4, label: "orange" },
  { x: 10, y: 6, label: "orange" },
  { x: 11, y: 8, label: "orange" },
];

const SCALE = 40; // pixels per unit
const OFFSET_X = 50;
const OFFSET_Y = 50;

export default function KNNDemo() {
  const [k, setK] = useState<number>(3);
  const [distanceMetric, setDistanceMetric] = useState<string>("euclidean");
  const [queryPoint, setQueryPoint] = useState<QueryPoint>({ x: 7, y: 6 });
  const [showCalculations, setShowCalculations] = useState<boolean>(true);
  const [showVoronoi, setShowVoronoi] = useState<boolean>(false);

  const calculateDistance = useCallback(
    (p1: Point | QueryPoint, p2: Point | QueryPoint): number => {
      const dx = Math.abs(p1.x - p2.x);
      const dy = Math.abs(p1.y - p2.y);

      switch (distanceMetric) {
        case "euclidean":
          return Math.sqrt(dx * dx + dy * dy);
        case "manhattan":
          return dx + dy;
        case "hamming":
          return (p1.x !== p2.x ? 1 : 0) + (p1.y !== p2.y ? 1 : 0);
        default:
          return Math.sqrt(dx * dx + dy * dy);
      }
    },
    [distanceMetric]
  );

  const getNearestNeighbors = useCallback((): DistanceResult[] => {
    const distances = INITIAL_POINTS.map((point, index) => ({
      point,
      distance: calculateDistance(queryPoint, point),
      index,
    }));

    return distances.sort((a, b) => a.distance - b.distance).slice(0, k);
  }, [queryPoint, k, calculateDistance]);

  const getPrediction = useCallback((): string => {
    const neighbors = getNearestNeighbors();
    const blueCount = neighbors.filter((n) => n.point.label === "blue").length;
    const orangeCount = neighbors.filter(
      (n) => n.point.label === "orange"
    ).length;

    if (blueCount > orangeCount) return "blue";
    if (orangeCount > blueCount) return "orange";
    return "tie";
  }, [getNearestNeighbors]);

  const handleCanvasClick = (event: React.MouseEvent<SVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round((event.clientX - rect.left - OFFSET_X) / SCALE);
    const y = Math.round((event.clientY - rect.top - OFFSET_Y) / SCALE);

    // Clamp to reasonable bounds
    const clampedX = Math.max(0, Math.min(13, x));
    const clampedY = Math.max(0, Math.min(10, y));

    setQueryPoint({ x: clampedX, y: clampedY });
  };
  const voronoiCells = useMemo(() => {
    if (!showVoronoi) return [];

    type Cell = { x: number; y: number; label: "blue" | "orange" | "tie" };

    const cells: Cell[] = [];
    const width = 600;
    const height = 450;
    const step = 5; // hou dit laag voor mooiere grenzen, hoger voor meer performance

    for (let px = 0; px < width; px += step) {
      for (let py = 0; py < height; py += step) {
        const dataX = (px - OFFSET_X) / SCALE;
        const dataY = (py - OFFSET_Y) / SCALE;

        // binnen je assenbereik
        if (dataX >= 0 && dataX <= 13 && dataY >= 0 && dataY <= 10) {
          // sorteer op afstand, pak de k dichtstbijzijnde
          const neighbors = INITIAL_POINTS.map((p, index) => ({
            point: p,
            index,
            distance: calculateDistance({ x: dataX, y: dataY }, p),
          }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, k);

          const blueCount = neighbors.filter(
            (n) => n.point.label === "blue"
          ).length;
          const orangeCount = k - blueCount;

          let label: Cell["label"] = "tie";
          if (blueCount > orangeCount) label = "blue";
          else if (orangeCount > blueCount) label = "orange";

          cells.push({ x: px, y: py, label });
        }
      }
    }
    return cells;
  }, [showVoronoi, k, calculateDistance]);

  const nearestNeighbors = getNearestNeighbors();
  const prediction = getPrediction();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Controls */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">K Value</label>
            <Select
              value={k.toString()}
              onValueChange={(value) => setK(Number.parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">K = 1</SelectItem>
                <SelectItem value="2">K = 2</SelectItem>
                <SelectItem value="3">K = 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Distance Metric
            </label>
            <Select value={distanceMetric} onValueChange={setDistanceMetric}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="euclidean">Euclidean</SelectItem>
                <SelectItem value="manhattan">Manhattan</SelectItem>
                <SelectItem value="hamming">Hamming</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              Visualization Options
            </label>
            <Button
              variant={showVoronoi ? "default" : "outline"}
              onClick={() => setShowVoronoi(!showVoronoi)}
              className="w-full"
            >
              {showVoronoi ? "Hide" : "Show"} Voronoi Diagram
            </Button>
            <p className="text-xs text-gray-500 mt-1"></p>
          </div>
          <div className="pt-4 border-t">
            <h3 className="font-medium mb-2">Question Mark</h3>
            <p className="text-sm text-gray-600 mb-2">
              Click on the plot to move the question mark
            </p>
            <p className="text-sm">
              Current: ({queryPoint.x}, {queryPoint.y})
            </p>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium mb-2">Prediction</h3>
            <Badge
              variant={
                prediction === "blue"
                  ? "default"
                  : prediction === "orange"
                  ? "secondary"
                  : "outline"
              }
              className={`text-white ${
                prediction === "blue"
                  ? "bg-blue-500"
                  : prediction === "orange"
                  ? "bg-orange-500"
                  : "bg-gray-500"
              }`}
            >
              {prediction === "tie"
                ? "Tie"
                : prediction.charAt(0).toUpperCase() + prediction.slice(1)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Visualization */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>KNN Visualization</CardTitle>
          <p className="text-sm text-gray-600">
            Click anywhere to place the question mark (❓)
          </p>
        </CardHeader>
        <CardContent>
          <svg
            width="600"
            height="450"
            className="border rounded-lg cursor-crosshair bg-white"
            onClick={handleCanvasClick}
          >
            {/* Grid */}
            <defs>
              <pattern
                id="grid"
                width={SCALE}
                height={SCALE}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`}
                  fill="none"
                  stroke="#f0f0f0"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {showVoronoi &&
              voronoiCells.map((cell, index) => (
                <rect
                  key={`voronoi-${index}`}
                  x={cell.x}
                  y={cell.y}
                  width="5"
                  height="5"
                  fill={
                    cell.label === "blue"
                      ? "#3b82f620" // blauwe waas
                      : cell.label === "orange"
                      ? "#f9731620" // oranje waas
                      : "#9ca3af20" // tie: lichtgrijs
                  }
                  stroke="none"
                />
              ))}

            {/* Distance lines to nearest neighbors */}
            {nearestNeighbors.map((neighbor, index) => (
              <line
                key={`line-${neighbor.index}`}
                x1={queryPoint.x * SCALE + OFFSET_X}
                y1={queryPoint.y * SCALE + OFFSET_Y}
                x2={neighbor.point.x * SCALE + OFFSET_X}
                y2={neighbor.point.y * SCALE + OFFSET_Y}
                stroke={neighbor.point.label === "blue" ? "#3b82f6" : "#f97316"}
                strokeWidth="3"
                strokeDasharray="8,4"
                opacity="0.8"
              />
            ))}

            {/* Data points */}
            {INITIAL_POINTS.map((point, index) => {
              const isNeighbor = nearestNeighbors.some(
                (n) => n.index === index
              );
              const neighborRank = nearestNeighbors.findIndex(
                (n) => n.index === index
              );

              return (
                <g key={index}>
                  {point.label === "blue" ? (
                    <rect
                      x={point.x * SCALE + OFFSET_X - 8}
                      y={point.y * SCALE + OFFSET_Y - 8}
                      width="16"
                      height="16"
                      fill="#3b82f6"
                      stroke={isNeighbor ? "#1d4ed8" : "none"}
                      strokeWidth={isNeighbor ? "3" : "0"}
                    />
                  ) : (
                    <circle
                      cx={point.x * SCALE + OFFSET_X}
                      cy={point.y * SCALE + OFFSET_Y}
                      r="8"
                      fill="#f97316"
                      stroke={isNeighbor ? "#ea580c" : "none"}
                      strokeWidth={isNeighbor ? "3" : "0"}
                    />
                  )}

                  {/* Point coordinates */}
                  <text
                    x={point.x * SCALE + OFFSET_X}
                    y={point.y * SCALE + OFFSET_Y - 15}
                    textAnchor="middle"
                    className="text-xs font-medium"
                    fill="#374151"
                  >
                    ({point.x},{point.y})
                  </text>

                  {/* Neighbor rank */}
                  {isNeighbor && (
                    <text
                      x={point.x * SCALE + OFFSET_X + 12}
                      y={point.y * SCALE + OFFSET_Y - 12}
                      className="text-xs font-bold"
                      fill="#dc2626"
                    >
                      #{neighborRank + 1}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Query point */}
            <g>
              <circle
                cx={queryPoint.x * SCALE + OFFSET_X}
                cy={queryPoint.y * SCALE + OFFSET_Y}
                r="12"
                fill="#fbbf24"
                stroke="#f59e0b"
                strokeWidth="2"
              />
              <text
                x={queryPoint.x * SCALE + OFFSET_X}
                y={queryPoint.y * SCALE + OFFSET_Y + 5}
                textAnchor="middle"
                className="text-lg font-bold"
                fill="#92400e"
              >
                ?
              </text>
              <text
                x={queryPoint.x * SCALE + OFFSET_X}
                y={queryPoint.y * SCALE + OFFSET_Y - 20}
                textAnchor="middle"
                className="text-xs font-medium"
                fill="#374151"
              >
                ({queryPoint.x},{queryPoint.y})
              </text>
            </g>

            {/* Axis labels */}
            <text x="20" y="25" className="text-sm font-medium" fill="#374151">
              Y
            </text>
            <text
              x="580"
              y="440"
              className="text-sm font-medium"
              fill="#374151"
            >
              X
            </text>
          </svg>
        </CardContent>
      </Card>

      {/* Calculations */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Distance Calculations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Point</th>
                  <th className="text-left p-2">Coordinates</th>
                  <th className="text-left p-2">Class</th>
                  <th className="text-left p-2">Distance Calculation</th>
                  <th className="text-left p-2">Distance</th>
                  <th className="text-left p-2">Rank</th>
                </tr>
              </thead>
              <tbody>
                {INITIAL_POINTS.map((point, index) => {
                  const distance = calculateDistance(queryPoint, point);
                  const neighborIndex = nearestNeighbors.findIndex(
                    (n) => n.index === index
                  );
                  const isNeighbor = neighborIndex !== -1;

                  let calculation = "";
                  const dx = Math.abs(queryPoint.x - point.x);
                  const dy = Math.abs(queryPoint.y - point.y);

                  switch (distanceMetric) {
                    case "euclidean":
                      calculation = `√((${queryPoint.x}-${point.x})² + (${
                        queryPoint.y
                      }-${point.y})²) = √(${dx}² + ${dy}²) = √${
                        dx * dx + dy * dy
                      }`;
                      break;
                    case "manhattan":
                      calculation = `|${queryPoint.x}-${point.x}| + |${queryPoint.y}-${point.y}| = ${dx} + ${dy}`;
                      break;
                    case "hamming":
                      const xDiff = queryPoint.x !== point.x ? 1 : 0;
                      const yDiff = queryPoint.y !== point.y ? 1 : 0;
                      calculation = `(${queryPoint.x}≠${point.x} ? 1 : 0) + (${queryPoint.y}≠${point.y} ? 1 : 0) = ${xDiff} + ${yDiff}`;
                      break;
                  }

                  return (
                    <tr
                      key={index}
                      className={`border-b ${
                        isNeighbor ? "bg-yellow-50 font-medium" : ""
                      }`}
                    >
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {point.label === "blue" ? (
                            <div className="w-4 h-4 bg-blue-500"></div>
                          ) : (
                            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                          )}
                          Point {index + 1}
                        </div>
                      </td>
                      <td className="p-2">
                        ({point.x}, {point.y})
                      </td>
                      <td className="p-2">
                        <Badge
                          variant={
                            point.label === "blue" ? "default" : "secondary"
                          }
                        >
                          {point.label}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono text-xs">{calculation}</td>
                      <td className="p-2 font-mono">{distance.toFixed(2)}</td>
                      <td className="p-2">
                        {isNeighbor ? (
                          <Badge variant="destructive">
                            #{neighborIndex + 1}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Classification Result:</h4>
            <p className="text-sm">
              Using K={k} nearest neighbors with {distanceMetric} distance:
            </p>
            <div className="flex gap-4 mt-2">
              <span>
                Blue votes:{" "}
                {
                  nearestNeighbors.filter((n) => n.point.label === "blue")
                    .length
                }
              </span>
              <span>
                Orange votes:{" "}
                {
                  nearestNeighbors.filter((n) => n.point.label === "orange")
                    .length
                }
              </span>
              <span className="font-medium">
                → Prediction:{" "}
                <Badge
                  variant={
                    prediction === "blue"
                      ? "default"
                      : prediction === "orange"
                      ? "secondary"
                      : "outline"
                  }
                  className={`text-white ${
                    prediction === "blue"
                      ? "bg-blue-500"
                      : prediction === "orange"
                      ? "bg-orange-500"
                      : "bg-gray-500"
                  }`}
                >
                  {prediction === "tie" ? "Tie" : prediction}
                </Badge>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
