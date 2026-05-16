import { useState } from 'react';
import { useStore } from '../store';
import { worldApi } from '../api/client';

export default function WorldEditor() {
  const { world, setWorld, worlds, setWorlds, setShowCreateWorld } = useStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  if (!world) return null;

  const handleSave = async () => {
    const updated = await worldApi.update(world.id, form);
    setWorld(updated);
    setEditing(false);
  };

  const handleDeleteWorld = async () => {
    await worldApi.delete(world.id);
    const remaining = worlds.filter(w => w.id !== world.id);
    setWorlds(remaining);
    if (remaining.length > 0) setWorld(remaining[0]);
    else setWorld(null);
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>世界设置</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setShowCreateWorld(true)}>创建新世界</button>
          <button className="btn btn-primary" onClick={() => { setForm({ ...world }); setEditing(!editing); }}>
            {editing ? '取消' : '编辑'}
          </button>
          <button className="btn btn-danger" onClick={handleDeleteWorld}>删除世界</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="char-card">
          <h3 style={{ marginBottom: 12 }}>基本信息</h3>
          {editing ? (
            <>
              <div className="form-group">
                <label>世界名称</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>基调</label>
                <input className="form-input" value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })} />
              </div>
              <button className="btn btn-primary" onClick={handleSave}>保存</button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, marginBottom: 8 }}><strong>名称：</strong>{world.name}</p>
              <p style={{ fontSize: 14, marginBottom: 8 }}><strong>描述：</strong>{world.description || '无'}</p>
              <p style={{ fontSize: 14, marginBottom: 8 }}><strong>基调：</strong>{world.tone}</p>
              <p style={{ fontSize: 14 }}><strong>规则：</strong>{world.rules?.join('、') || '无'}</p>
            </>
          )}
        </div>

        <div className="char-card">
          <h3 style={{ marginBottom: 12 }}>时间</h3>
          <p style={{ fontSize: 14, marginBottom: 8 }}>Tick：{world.time.tick}</p>
          <p style={{ fontSize: 14, marginBottom: 8 }}>时段：{world.time.dayPeriod}</p>
          <p style={{ fontSize: 14, marginBottom: 8 }}>季节：{world.time.season}</p>
          <p style={{ fontSize: 14, marginBottom: 8 }}>年份：{world.time.year}</p>
          <p style={{ fontSize: 14 }}>每 Tick/天：{world.time.ticksPerDay}</p>
        </div>

        <div className="char-card" style={{ gridColumn: '1/-1' }}>
          <h3 style={{ marginBottom: 12 }}>地点（{world.locations?.length || 0} 个）</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {world.locations?.map(loc => (
              <div key={loc.id} style={{
                padding: 12, background: '#F5F9FC', borderRadius: 8,
                border: '1px solid #E0E8F0'
              }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{loc.name}</div>
                <div style={{ fontSize: 12, color: '#7F8C8D' }}>{loc.type}</div>
                <div style={{ fontSize: 12, color: '#7F8C8D', marginTop: 4 }}>{loc.description}</div>
                <div style={{ fontSize: 11, color: '#95A5A6', marginTop: 4 }}>
                  在场角色：{loc.charactersPresent?.length || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
