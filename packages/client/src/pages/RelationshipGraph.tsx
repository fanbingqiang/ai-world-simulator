import { useMemo } from 'react';
import { useStore } from '../store';

export default function RelationshipGraph() {
  const { characters } = useStore();

  // 从角色数据中提取关系
  const { nodes, edges } = useMemo(() => {
    const nodeList = characters.map(c => ({
      id: c.id, name: c.name, role: c.role,
      emotionalState: c.emotionalState?.primary || '平静',
      energy: c.energy || 80
    }));

    const edgeList: any[] = [];
    for (const c of characters) {
      for (const rel of c.relationships) {
        if (characters.find(x => x.id === rel.characterId)) {
          edgeList.push({
            source: c.id, target: rel.characterId,
            type: rel.type, affinity: rel.affinity, trust: rel.trust, conflict: rel.conflict,
            label: `${rel.type} ${rel.affinity > 0 ? '+' : ''}${rel.affinity}`
          });
        }
      }
    }
    return { nodes: nodeList, edges: edgeList };
  }, [characters]);

  // 力导向布局计算
  const positions = useMemo(() => {
    if (nodes.length === 0) return {};
    const centerX = 350, centerY = 250;
    const pos: Record<string, { x: number; y: number }> = {};

    // 初始位置（圆形分布）
    const angleStep = (2 * Math.PI) / nodes.length;
    nodes.forEach((n, i) => {
      const angle = angleStep * i - Math.PI / 2;
      pos[n.id] = { x: centerX + 150 * Math.cos(angle), y: centerY + 150 * Math.sin(angle) };
    });

    // 力导向迭代
    for (let iter = 0; iter < 60; iter++) {
      const forces: Record<string, { fx: number; fy: number }> = {};
      nodes.forEach(n => { forces[n.id] = { fx: 0, fy: 0 }; });

      // 排斥力
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = pos[nodes[i].id], b = pos[nodes[j].id];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 8000 / (dist * dist);
          forces[nodes[i].id].fx += (dx / dist) * force;
          forces[nodes[i].id].fy += (dy / dist) * force;
          forces[nodes[j].id].fx -= (dx / dist) * force;
          forces[nodes[j].id].fy -= (dy / dist) * force;
        }
      }

      // 边的吸引力
      edges.forEach(e => {
        const a = pos[e.source], b = pos[e.target];
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const targetDist = 160;
        const force = (dist - targetDist) * 0.008;
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

      // 应用
      nodes.forEach(n => {
        pos[n.id] = {
          x: pos[n.id].x + forces[n.id].fx,
          y: pos[n.id].y + forces[n.id].fy
        };
      });
    }
    return pos;
  }, [nodes, edges]);

  return (
    <div className="page">
      <div className="panel-header" style={{ padding: '0 0 14px 0' }}>
        <h2>关系图</h2>
        <span style={{ fontSize: 12, color: '#64748B' }}>
          {nodes.length} 个角色，{edges.length} 条关系
        </span>
      </div>

      {nodes.length === 0 ? (
        <div className="empty-state">
          <p>还没有角色</p>
          <p style={{ fontSize: 12 }}>创建角色后，关系图会自动生成</p>
        </div>
      ) : (
        <div className="graph-container" style={{ position: 'relative', height: 500 }}>
          <svg width="100%" height="100%" viewBox="0 0 700 500" style={{ background: '#FAFBFC', borderRadius: 8 }}>
            {/* 关系连线 */}
            {edges.map((e, i) => {
              const from = positions[e.source], to = positions[e.target];
              if (!from || !to) return null;
              const color = e.affinity > 20 ? '#16A34A' : e.affinity < -20 ? '#DC2626' : '#94A3B8';
              const dash = e.type === 'rivalry' || e.type === 'enmity' ? '5,5' : undefined;
              return (
                <g key={i}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={color} strokeWidth={Math.max(1.5, Math.abs(e.affinity) / 15)}
                    strokeDasharray={dash} opacity={0.5} />
                  <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6}
                    textAnchor="middle" fill="#64748B" fontSize={10}>
                    {e.label}
                  </text>
                </g>
              );
            })}

            {/* 角色节点 */}
            {nodes.map(n => {
              const p = positions[n.id];
              if (!p) return null;
              return (
                <g key={n.id}>
                  {/* 头像背景 */}
                  <circle cx={p.x} cy={p.y} r={22} fill="#2563EB" stroke="white" strokeWidth={2.5} />
                  {/* 名字首字 */}
                  <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                    fill="white" fontSize={13} fontWeight={600}>
                    {n.name[0]}
                  </text>
                  {/* 名字 */}
                  <text x={p.x} y={p.y + 30} textAnchor="middle" fill="#1E293B" fontSize={11} fontWeight={500}>
                    {n.name}
                  </text>
                  {/* 情绪 */}
                  <text x={p.x} y={p.y + 42} textAnchor="middle" fill="#64748B" fontSize={10}>
                    {n.emotionalState} | 精力{n.energy}
                  </text>
                  {/* 角色 */}
                  <text x={p.x} y={p.y + 54} textAnchor="middle" fill="#94A3B8" fontSize={9}>
                    {n.role}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
