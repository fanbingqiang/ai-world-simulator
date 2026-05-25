import { useState } from 'react';
import { useStore } from '../store';
import { worldApi } from '../api/client';

const LOCATION_TYPES = [
  { value: 'safe-zone', label: '安全区' },
  { value: 'urban', label: '城镇' },
  { value: 'wilderness', label: '野外' },
  { value: 'dungeon', label: '地牢' },
  { value: 'home', label: '住所' },
];

export default function WorldEditor() {
  const { world, setWorld, worlds, setWorlds, setShowCreateWorld } = useStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  // 地点管理
  const [showAddLoc, setShowAddLoc] = useState(false);
  const [newLoc, setNewLoc] = useState({ name: '', description: '', type: 'urban' });
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editLocForm, setEditLocForm] = useState<any>({});

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

  const handleAddLocation = async () => {
    if (!newLoc.name.trim()) return;
    const updated = await worldApi.addLocation(world.id, newLoc);
    setWorld(updated);
    setNewLoc({ name: '', description: '', type: 'urban' });
    setShowAddLoc(false);
  };

  const handleUpdateLocation = async (locId: string) => {
    const locs = [...world.locations];
    const idx = locs.findIndex(l => l.id === locId);
    if (idx < 0) return;
    locs[idx] = { ...locs[idx], ...editLocForm };
    const updated = await worldApi.update(world.id, { locations: locs });
    setWorld(updated);
    setEditingLocId(null);
  };

  const handleDeleteLocation = async (locId: string) => {
    const locs = world.locations.filter(l => l.id !== locId);
    const updated = await worldApi.update(world.id, { locations: locs });
    setWorld(updated);
  };

  const startEditLoc = (loc: any) => {
    setEditLocForm({ name: loc.name, description: loc.description, type: loc.type });
    setEditingLocId(loc.id);
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>地点（{world.locations?.length || 0} 个）</h3>
            <button className="btn btn-primary" onClick={() => setShowAddLoc(true)}>+ 添加地点</button>
          </div>

          {/* 添加地点表单 */}
          {showAddLoc && (
            <div style={{
              padding: 12, marginBottom: 12, background: '#F0F7FF', borderRadius: 8,
              border: '1px solid #BFDBFE', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end'
            }}>
              <div className="form-group" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
                <label>名称</label>
                <input className="form-input" value={newLoc.name}
                  onChange={e => setNewLoc({ ...newLoc, name: e.target.value })}
                  placeholder="地点名称" />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
                <label>描述</label>
                <input className="form-input" value={newLoc.description}
                  onChange={e => setNewLoc({ ...newLoc, description: e.target.value })}
                  placeholder="简短描述" />
              </div>
              <div className="form-group" style={{ minWidth: 100, marginBottom: 0 }}>
                <label>类型</label>
                <select className="form-input" value={newLoc.type}
                  onChange={e => setNewLoc({ ...newLoc, type: e.target.value })}>
                  {LOCATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-primary" onClick={handleAddLocation}>添加</button>
                <button className="btn" onClick={() => setShowAddLoc(false)}>取消</button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {world.locations?.map(loc => (
              <div key={loc.id} style={{
                padding: 12, background: '#F5F9FC', borderRadius: 8,
                border: '1px solid #E0E8F0'
              }}>
                {editingLocId === loc.id ? (
                  <>
                    <div className="form-group" style={{ marginBottom: 6 }}>
                      <label>名称</label>
                      <input className="form-input" value={editLocForm.name}
                        onChange={e => setEditLocForm({ ...editLocForm, name: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 6 }}>
                      <label>描述</label>
                      <input className="form-input" value={editLocForm.description}
                        onChange={e => setEditLocForm({ ...editLocForm, description: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 6 }}>
                      <label>类型</label>
                      <select className="form-input" value={editLocForm.type}
                        onChange={e => setEditLocForm({ ...editLocForm, type: e.target.value })}>
                        {LOCATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: '3px 10px' }}
                        onClick={() => handleUpdateLocation(loc.id)}>保存</button>
                      <button className="btn" style={{ fontSize: 12, padding: '3px 10px' }}
                        onClick={() => setEditingLocId(null)}>取消</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{loc.name}</div>
                    <div style={{ fontSize: 12, color: '#7F8C8D' }}>
                      {LOCATION_TYPES.find(t => t.value === loc.type)?.label || loc.type}
                    </div>
                    <div style={{ fontSize: 12, color: '#7F8C8D', marginTop: 4 }}>{loc.description}</div>
                    <div style={{ fontSize: 11, color: '#95A5A6', marginTop: 4 }}>
                      在场角色：{loc.charactersPresent?.length || 0}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => startEditLoc(loc)}>编辑</button>
                      <button className="btn btn-danger" style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => handleDeleteLocation(loc.id)}>删除</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
