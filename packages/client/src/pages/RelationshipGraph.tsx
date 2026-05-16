import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { analyticsApi } from '../api/client';

interface GraphNode { id: string; name: string; role: string; emotionalState: string; }
interface GraphEdge { source: string; target: string; type: string; affinity: number; trust: number; conflict: number; }

export default function RelationshipGraph() {
  const { world } = useStore();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);

  useEffect(() => {
    if (!world) return;
    analyticsApi.relationships(world.id).then(data => {
      setNodes(data.nodes);
      setEdges(data.edges);
    });
  }, [world?.id]);

  // 简单力导向布局
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dims] = useState({ w: 600, h: 400 });

  useEffect(() => {
    if (nodes.length === 0) return;
    const centerX = dims.w / 2;
    const centerY = dims.h / 2;
    const initial: Record<string, { x: number; y: number }> = {};
    const angleStep = (2 * Math.PI) / nodes.length;

    nodes.forEach((n, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const radius = 150;
      initial[n.id] = { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
    });

    // 简单迭代优化
    let pos = { ...initial };
    for (let iter = 0; iter < 50; iter++) {
      const forces: Record<string, { fx: number; fy: number }> = {};
      nodes.forEach(n => { forces[n.id] = { fx: 0, fy: 0 }; });

      // 排斥力
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = pos[nodes[i].id], b = pos[nodes[j].id];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 5000 / (dist * dist);
          forces[nodes[i].id].fx += (dx / dist) * force;
          forces[nodes[i].id].fy += (dy / dist) * force;
          forces[nodes[j].id].fx -= (dx / dist) * force;
          forces[nodes[j].id].fy -= (dy / dist) * force;
        }
      }

      // 吸引力（边）
      edges.forEach(e => {
        const a = pos[e.source], b = pos[e.target];
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = (dist - 180) * 0.01;
        forces[e.source].fx += dx * force;
        forces[e.source].fy += dy * force;
        forces[e.target].fx -= dx * force;
        forces[e.target].fy -= dy * force;
      });

      // 向心力
      nodes.forEach(n => {
        forces[n.id].fx += (centerX - pos[n.id].x) * 0.01;
        forces[n.id].fy += (centerY - pos[n.id].y) * 0.01;
      });

      // 应用力
      nodes.forEach(n => {
        pos[n.id] = {
          x: pos[n.id].x + forces[n.id].fx,
          y: pos[n.id].y + forces[n.id].fy
        };
      });
    }

    setPositions(pos);
  }, [nodes, edges, dims.w, dims.h]);

  return (
    <div className="page">
      <div className="panel-header" style={{ padding: '0 0 16px 0' }}>
        <h2>关系图</h2>
      </div>

      <div className="graph-container" style={{ position: 'relative' }}>
        <svg width={dims.w} height={dims.h} style={{ background: '#FAFBFC', borderRadius: 8 }}>
          {/* 边 */}
          {edges.map((e, i) => {
            const from = positions[e.source], to = positions[e.target];
            if (!from || !to) return null;
            const color = e.affinity > 30 ? '#27AE60' : e.affinity < -30 ? '#E74C3C' : '#95A5A6';
            return (
              <line key={i}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={color} strokeWidth={Math.max(1, Math.abs(e.affinity) / 20)}
                opacity={0.6}
                onMouseEnter={() => setHoveredEdge(e)}
                onMouseLeave={() => setHoveredEdge(null)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}

          {/* 节点 */}
          {nodes.map(n => {
            const p = positions[n.id];
            if (!p) return null;
            return (
              <g key={n.id}>
                <circle cx={p.x} cy={p.y} r={24} fill="#7BB8E8" stroke="white" strokeWidth={2}
                  style={{ cursor: 'pointer' }} />
                <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                  fill="white" fontSize={12} fontWeight={600} style={{ pointerEvents: 'none' }}>
                  {n.name[0]}
                </text>
                <text x={p.x} y={p.y + 34} textAnchor="middle" fill="#2C3E50" fontSize={11}>
                  {n.name}
                </text>
                <text x={p.x} y={p.y + 48} textAnchor="middle" fill="#7F8C8D" fontSize={10}>
                  {n.emotionalState}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 悬停提示 */}
        {hoveredEdge && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'white', padding: '8px 16px', borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: 13
          }}>
            <span>类型：{hoveredEdge.type} | </span>
            <span>好感：{hoveredEdge.affinity > 0 ? '+' : ''}{hoveredEdge.affinity} | </span>
            <span>信任：{hoveredEdge.trust} | </span>
            <span>冲突：{hoveredEdge.conflict}</span>
          </div>
        )}
      </div>
    </div>
  );
}
