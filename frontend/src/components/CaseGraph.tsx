import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, Edge, Node, Position, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import { Case } from "@/types";
import { Dialog } from "@/components/ui/Dialog";

interface GraphInput {
  case: Case;
  people: string[];
  locations: string[];
  evidenceNumbers: string[];
  documentNames: string[];
}

const CATEGORY_COLOR: Record<string, string> = {
  case: "#38bdf8",
  person: "#a78bfa",
  location: "#34d399",
  evidence: "#fbbf24",
  document: "#93a4c3",
};

function nodeStyle(color: string, isCenter = false) {
  return {
    background: isCenter ? color : "#16213a",
    color: isCenter ? "#0b1220" : "#e6edf7",
    border: `1.5px solid ${color}`,
    borderRadius: 8,
    padding: isCenter ? "10px 16px" : "6px 12px",
    fontSize: isCenter ? 13 : 11,
    fontWeight: isCenter ? 700 : 500,
    minWidth: isCenter ? 160 : 110,
    textAlign: "center" as const,
  };
}

function ring(count: number, radius: number, centerX: number, centerY: number, yScale = 1) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / Math.max(count, 1) - Math.PI / 2;
    return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) * yScale };
  });
}

export function CaseGraph({ case: c, people, locations, evidenceNumbers, documentNames }: GraphInput) {
  const [selected, setSelected] = useState<{ type: string; label: string } | null>(null);

  const { nodes, edges } = useMemo(() => {
    const centerX = 480;
    const centerY = 320;
    const nodes: Node[] = [
      {
        id: "case",
        data: { label: c.case_number, category: "case" },
        position: { x: centerX - 80, y: centerY - 20 },
        style: nodeStyle(CATEGORY_COLOR.case, true),
        sourcePosition: Position.Right,
      },
    ];
    const edges: Edge[] = [];

    const groups: { key: string; items: string[]; radius: number }[] = [
      { key: "person", items: people.slice(0, 6), radius: 220 },
      { key: "location", items: locations.slice(0, 6), radius: 320 },
      { key: "evidence", items: evidenceNumbers.slice(0, 6), radius: 420 },
      { key: "document", items: documentNames.slice(0, 6), radius: 520 },
    ];

    groups.forEach((group) => {
      const positions = ring(group.items.length, group.radius, centerX, centerY, 0.55);
      group.items.forEach((label, idx) => {
        const id = `${group.key}-${idx}`;
        nodes.push({
          id,
          data: { label, category: group.key },
          position: positions[idx],
          style: nodeStyle(CATEGORY_COLOR[group.key]),
        });
        edges.push({
          id: `case-${id}`,
          source: "case",
          target: id,
          type: "smoothstep",
          style: { stroke: CATEGORY_COLOR[group.key], opacity: 0.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: CATEGORY_COLOR[group.key] },
        });
      });
    });

    return { nodes, edges };
  }, [c.case_number, people, locations, evidenceNumbers, documentNames]);

  return (
    <div className="h-[560px] w-full rounded-lg border border-base-border bg-base-bg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => setSelected({ type: node.data.category, label: node.data.label })}
      >
        <Background color="#22304a" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>

      <Dialog open={!!selected} onClose={() => setSelected(null)} title={selected?.label ?? ""}>
        <p className="text-xs text-text-secondary">
          Category: <span className="text-text-primary font-medium">{selected?.type}</span>
        </p>
        <p className="mt-2 text-xs text-text-muted">
          This node represents an entity identified by AI entity extraction within case {c.case_number}. Open the case's AI Intelligence tab for full
          source attribution.
        </p>
      </Dialog>
    </div>
  );
}
