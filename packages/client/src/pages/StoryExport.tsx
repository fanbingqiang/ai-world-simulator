import { useState } from 'react';
import { useStore } from '../store';
import { storyApi } from '../api/client';

export default function StoryExport() {
  const { world } = useStore();
  const [arcs, setArcs] = useState<any[]>([]);
  const [selectedArc, setSelectedArc] = useState<string>('');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const loadArcs = async () => {
    if (!world) return;
    const data = await storyApi.list(world.id);
    setArcs(data);
  };

  const handleExport = async () => {
    if (!selectedArc) return;
    setLoading(true);
    try {
      const result = await storyApi.export(selectedArc);
      setPreview(result.markdown);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="panel-header" style={{ padding: '0 0 16px 0' }}>
        <h2>故事导出</h2>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button className="btn" onClick={loadArcs}>加载故事弧</button>
        <select className="form-input" style={{ width: 240 }} value={selectedArc} onChange={e => setSelectedArc(e.target.value)}>
          <option value="">选择故事弧...</option>
          {arcs.map(a => <option key={a.id} value={a.id}>{a.name}（{a.progress}%）</option>)}
        </select>
        <button className="btn btn-primary" onClick={handleExport} disabled={!selectedArc || loading}>
          {loading ? '生成中...' : '导出'}
        </button>
      </div>

      {!world && (
        <div className="empty-state"><p>请先创建世界</p></div>
      )}

      {preview && (
        <div>
          <h3 style={{ marginBottom: 8 }}>预览</h3>
          <div className="export-preview">{preview}</div>
        </div>
      )}

      {!preview && world && (
        <div className="empty-state">
          <p>选择一个故事弧并点击「导出」生成小说</p>
          <p style={{ fontSize: 13 }}>故事弧会在模拟运行时自动创建，你也可以手动创建</p>
        </div>
      )}
    </div>
  );
}
