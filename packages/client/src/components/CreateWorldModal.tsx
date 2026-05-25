import { useState } from 'react';
import { useStore } from '../store';
import { worldApi } from '../api/client';

export default function CreateWorldModal() {
  const { setWorld, setWorlds, worlds, setShowCreateWorld } = useStore();
  const [form, setForm] = useState({
    name: '',
    description: '',
    tone: 'neutral',
    rules: '',
    locationNames: '小镇广场, 酒馆, 城堡, 森林, 集市'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const locationNames = form.locationNames.split(',').map(s => s.trim()).filter(Boolean);
      const locations = locationNames.map((name, i) => ({
        id: `loc_${Date.now()}_${i}`,
        name,
        description: `${name}的描述`,
        type: i === 0 ? 'safe-zone' : i === 2 ? 'urban' : 'wilderness',
        connectedLocations: [],
        charactersPresent: [],
        tags: []
      }));

      // 连接相邻地点
      for (let i = 0; i < locations.length; i++) {
        if (i > 0) locations[i].connectedLocations.push(locations[i - 1].id);
        if (i < locations.length - 1) locations[i].connectedLocations.push(locations[i + 1].id);
      }

      const world = await worldApi.create({
        name: form.name || '新世界',
        description: form.description,
        tone: form.tone,
        rules: form.rules.split('\n').filter(Boolean),
        locations
      });

      setWorld(world);
      setWorlds([world, ...worlds]);
      setShowCreateWorld(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setShowCreateWorld(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>创建新世界</h2>

        <div className="form-group">
          <label>世界名称</label>
          <input className="form-input" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="例如：艾尔德兰大陆" />
        </div>

        <div className="form-group">
          <label>世界描述</label>
          <textarea className="form-input" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="描述这个世界的背景..." />
        </div>

        <div className="form-group">
          <label>基调（如：黑暗、英雄、奇幻、写实）</label>
          <input className="form-input" value={form.tone}
            onChange={e => setForm({ ...form, tone: e.target.value })}
            placeholder="例如：黑暗英雄史诗" />
        </div>

        <div className="form-group">
          <label>世界规则（每行一条）</label>
          <textarea className="form-input" value={form.rules}
            onChange={e => setForm({ ...form, rules: e.target.value })}
            placeholder="例如：禁止魔法&#10;蒸汽朋克科技" />
        </div>

        <div className="form-group">
          <label>初始地点（逗号分隔）</label>
          <input className="form-input" value={form.locationNames}
            onChange={e => setForm({ ...form, locationNames: e.target.value })} />
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={() => setShowCreateWorld(false)}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '创建中...' : '创建世界'}
          </button>
        </div>
      </div>
    </div>
  );
}
