"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PathInfo } from "./d-separation";

interface PathVisualizationPanelProps {
  targetNode: string | null;
  selectedNode: string | null;
  pathInfos: PathInfo[];
  onSelectPath: (path: string[] | null) => void;
  selectedPath: string[] | null;
}

export function PathVisualizationPanel({
  targetNode,
  selectedNode,
  pathInfos,
  onSelectPath,
  selectedPath,
}: PathVisualizationPanelProps) {
  if (!targetNode || !selectedNode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Path Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Select a target node and click on another node to see path
            visualization
          </p>
        </CardContent>
      </Card>
    );
  }

  const blockedPaths = pathInfos.filter((p) => p.isBlocked);
  const unblockedPaths = pathInfos.filter((p) => !p.isBlocked);
  const isDSeparated =
    pathInfos.length > 0 && pathInfos.every((p) => p.isBlocked);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Path Visualization: {targetNode} → {selectedNode}
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={isDSeparated ? "destructive" : "default"}>
            {isDSeparated ? "D-Separated" : "Not D-Separated"}
          </Badge>
          <span className="text-sm text-gray-600">
            ({pathInfos.length} path{pathInfos.length !== 1 ? "s" : ""} found)
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pathInfos.length === 0 && (
          <p className="text-gray-500">No paths found between these nodes</p>
        )}

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Visual Legend</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-500"></div>
              <span>Open path segment (blue solid line)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-red-600 border-dashed border-t-2 border-red-600"></div>
              <span>Blocked path segment (red dashed line)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span>
                Blocking node (node that causes the path to be blocked)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600">→</span>
              <span>
                Path direction arrows (show information flow direction)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gray-400 opacity-30"></div>
              <span>Network edges (dimmed when showing path)</span>
            </div>
          </div>
        </div>

        {blockedPaths.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
              🚫 Blocked Paths ({blockedPaths.length})
            </h4>
            <div className="space-y-2">
              {blockedPaths.map((pathInfo, index) => (
                <div
                  key={index}
                  className="border border-red-200 rounded p-3 bg-red-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm bg-white px-2 py-1 rounded font-mono">
                      {pathInfo.path.join(" → ")}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectPath(pathInfo.path)}
                      className={
                        selectedPath?.join("→") === pathInfo.path.join("→")
                          ? "bg-red-100 border-red-300"
                          : ""
                      }
                    >
                      Show Path Flow
                    </Button>
                  </div>
                  {pathInfo.blockingReason && (
                    <div className="text-sm text-red-700 bg-red-100 p-2 rounded">
                      <strong>🛑 Blocked:</strong> {pathInfo.blockingReason}
                    </div>
                  )}
                  {pathInfo.blockingNode && (
                    <div className="text-xs text-red-600 mt-1">
                      Path flows{" "}
                      <span className="text-blue-600 font-semibold">blue</span>{" "}
                      until blocked at <strong>{pathInfo.blockingNode}</strong>,
                      then turns{" "}
                      <span className="text-red-600 font-semibold">red</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {unblockedPaths.length > 0 && (
          <div>
            <h4 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
              ✅ Open Paths ({unblockedPaths.length})
            </h4>
            <div className="space-y-2">
              {unblockedPaths.map((pathInfo, index) => (
                <div
                  key={index}
                  className="border border-green-200 rounded p-3 bg-green-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm bg-white px-2 py-1 rounded font-mono">
                      {pathInfo.path.join(" → ")}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectPath(pathInfo.path)}
                      className={
                        selectedPath?.join("→") === pathInfo.path.join("→")
                          ? "bg-green-100 border-green-300"
                          : ""
                      }
                    >
                      Show Path Flow
                    </Button>
                  </div>
                  <div className="text-sm text-green-700 bg-green-100 p-2 rounded">
                    <strong>✅ Open:</strong> Information can flow along this
                    entire path (shown in blue with direction arrows)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <h4 className="font-semibold mb-2">D-Separation Rule</h4>
          <p className="text-sm text-gray-600">
            Two nodes are <strong>d-separated</strong> if <em>all</em> paths
            between them are blocked by evidence.
            {isDSeparated
              ? " ✓ All paths are blocked, so these nodes are conditionally independent."
              : " ✗ At least one path remains open, so these nodes are not conditionally independent."}
          </p>
        </div>

        {selectedPath && (
          <div className="pt-2 border-t bg-gray-50 p-3 rounded">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Currently visualizing path flow:
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelectPath(null)}
              >
                Clear Visualization
              </Button>
            </div>
            <code className="text-sm text-blue-600 font-mono mt-1 block">
              {selectedPath.join(" → ")}
            </code>
            <p className="text-xs text-gray-600 mt-1">
              Blue arrows show path direction. Path starts blue and turns red at
              blocking point.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
