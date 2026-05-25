import { useState } from 'react';
import { useStore } from '../store';
import { characterApi } from '../api/client';

const ALIGNMENTS: Record<string, string> = {
  'lawful-good': '守序善良', 'neutral-good': '中立善良', 'chaotic-good': '混乱善良',
  'lawful-neutral': '守序中立', 'true-neutral': '绝对中立', 'chaotic-neutral': '混乱中立',
  'lawful-evil': '守序邪恶', 'neutral-evil': '中立邪恶', 'chaotic-evil': '混乱邪恶',
};

function TraitSlider({ label, val, onChange }: { label: string; val: number; onChange: (v: number) => void }) {
  return (
    <div className="form-group" style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span>{label}</span><span style={{ color: '#2563EB', fontWeight: 600 }}>{val}</span>
      </div>
      <input type="range" min="0" max="100" value={val}
        onChange={e => onChange(parseInt(e.target.value))} style={{ width: '100%' }} />
    </div>
  );
}

export default function CharacterManager() {
  const { characters, world, setCharacters, setShowCreateChar, updateCharacter, selectedCharacterId, setSelectedCharacterId } = useStore();
  const [selected, setSelected] = useState<string | null>(selectedCharacterId);
  const char = selected ? characters.find(c => c.id === selected) || null : null;

  // 同步外部选中的角色（从侧边栏点击过来）
  if (selectedCharacterId && selectedCharacterId !== selected) {
    setSelected(selectedCharacterId);
  }

  // 编辑弹窗状态
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  const openEdit = () => {
    if (!char) return;
    setEditForm({
      name: char.name, age: char.age, role: char.role,
      backstory: char.backstory,
      openness: char.personality.openness,
      conscientiousness: char.personality.conscientiousness,
      extraversion: char.personality.extraversion,
      agreeableness: char.personality.agreeableness,
      neuroticism: char.personality.neuroticism,
      traits: [...char.traits],
      moralAlignment: char.moralAlignment,
    });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editForm || !char) return;
    try {
      await characterApi.update(char.id, {
        name: editForm.name, age: editForm.age, role: editForm.role,
        backstory: editForm.backstory,
        personality: {
          openness: editForm.openness, conscientiousness: editForm.conscientiousness,
          extraversion: editForm.extraversion, agreeableness: editForm.agreeableness,
          neuroticism: editForm.neuroticism,
        },
        traits: editForm.traits, moralAlignment: editForm.moralAlignment,
      });
      const updated = await characterApi.list(world?.id);
      setCharacters(updated);
      setShowEdit(false);
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  const deleteChar = async (id: string) => {
    try {
      await characterApi.delete(id);
      const updated = await characterApi.list(world?.id);
      setCharacters(updated);
      if (selected === id) setSelected(null);
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2>角色管理 ({characters.length})</h2>
          <button className="btn btn-primary" onClick={() => setShowCreateChar(true)}>+ 创建</button>
        </div>
        <div className="char-grid">
          {characters.map(c => (
            <div key={c.id} className="char-card"
              onClick={() => { setSelected(c.id); setSelectedCharacterId(c.id); }}
              style={{ cursor: 'pointer', border: selected === c.id ? '2px solid #2563EB' : undefined }}>
              <div className="char-header">
                <div className="char-avatar">{c.name[0]}</div>
                <div>
                  <div className="char-name">{c.name}</div>
                  <div className="char-role">{c.role} · {c.age}岁</div>
                </div>
              </div>
              <div className="card-section">
                <h4>性格</h4>
                <div style={{ fontSize: 11, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span className="trait-tag">开{c.personality.openness}</span>
                  <span className="trait-tag">尽{c.personality.conscientiousness}</span>
                  <span className="trait-tag">外{c.personality.extraversion}</span>
                  <span className="trait-tag">宜{c.personality.agreeableness}</span>
                  <span className="trait-tag">神{c.personality.neuroticism}</span>
                </div>
              </div>
              <div className="card-section">
                <h4>标签</h4>
                {c.traits.map((t, i) => <span key={i} className="trait-tag">{t}</span>)}
              </div>
              <div className="card-section">
                <h4>状态</h4>
                <div style={{ fontSize: 12 }}>{c.emotionalState.primary} · 精力 {c.energy}</div>
              </div>
            </div>
          ))}
          {characters.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <p>还没有角色</p>
              <button className="btn btn-primary" onClick={() => setShowCreateChar(true)}>创建第一个角色</button>
            </div>
          )}
        </div>
      </div>

      {/* 详情面板 */}
      {char && !showEdit && (
        <div style={{ width: 300, flexShrink: 0 }}>
          <div className="char-card">
            <div className="char-header">
              <div className="char-avatar">{char.name[0]}</div>
              <div>
                <div className="char-name">{char.name}</div>
                <div className="char-role">{ALIGNMENTS[char.moralAlignment] || char.moralAlignment}</div>
              </div>
            </div>
            <div className="card-section">
              <h4>背景</h4>
              <p style={{ fontSize: 12, color: '#64748B' }}>{char.backstory || '无'}</p>
            </div>
            <div className="card-section">
              <h4>秘密</h4>
              {char.secrets.map((s, i) => (
                <div key={i} style={{ fontSize: 12, padding: '2px 0' }}>
                  {s.isRevealed ? '🔓' : '🔒'} {s.content}
                </div>
              ))}
              {!char.secrets.length && <p style={{ fontSize: 12, color: '#64748B' }}>无</p>}
            </div>
            <div className="card-section">
              <h4>关系</h4>
              {char.relationships.map((r, i) => {
                const other = characters.find(c => c.id === r.characterId);
                const typeLabel: Record<string, string> = {
                  'romance': '恋人', 'friendship': '朋友', 'rivalry': '对手',
                  'family': '家人', 'mentor': '师徒', 'alliance': '同盟',
                  'enmity': '仇敌', 'acquaintance': '相识'
                };
                return (
                  <div key={i} style={{ fontSize: 12, padding: '3px 0', borderBottom: '1px solid #F0F0F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500 }}>{other?.name || '?'}</span>
                      <span style={{ fontSize: 10, color: '#64748B' }}>{typeLabel[r.type] || r.type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 10, marginTop: 2 }}>
                      <span style={{ color: r.affinity >= 0 ? '#16A34A' : '#DC2626' }}>
                        好感 {r.affinity > 0 ? '+' : ''}{r.affinity}
                      </span>
                      <span style={{ color: '#2563EB' }}>信任 {r.trust}</span>
                      {r.conflict > 0 && <span style={{ color: '#DC2626' }}>冲突 {r.conflict}</span>}
                    </div>
                  </div>
                );
              })}
              {!char.relationships.length && <p style={{ fontSize: 12, color: '#64748B' }}>暂无</p>}
            </div>
            <div className="card-section">
              <h4>近期记忆</h4>
              {char.memories.slice(-3).reverse().map(m => (
                <div key={m.id} style={{ fontSize: 12, padding: '3px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <div>{m.title}</div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>Tick {m.tick} · {m.emotionalImpact}</div>
                </div>
              ))}
              {!char.memories.length && <p style={{ fontSize: 12, color: '#64748B' }}>暂无</p>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button className="btn btn-primary" onClick={openEdit}>编辑</button>
              <button className="btn btn-danger" onClick={() => deleteChar(char.id)}>删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEdit && editForm && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2>编辑 {editForm.name}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="form-group">
                  <label>名称</label>
                  <input className="form-input" value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>年龄</label>
                  <input type="number" className="form-input" value={editForm.age}
                    onChange={e => setEditForm({ ...editForm, age: parseInt(e.target.value) || 25 })} />
                </div>
                <div className="form-group">
                  <label>身份</label>
                  <input className="form-input" value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>道德倾向</label>
                  <select className="form-input" value={editForm.moralAlignment}
                    onChange={e => setEditForm({ ...editForm, moralAlignment: e.target.value })}>
                    {Object.entries(ALIGNMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 12, marginBottom: 6, color: '#64748B' }}>性格</h4>
                <TraitSlider label="开放性" val={editForm.openness} onChange={v => setEditForm({ ...editForm, openness: v })} />
                <TraitSlider label="尽责性" val={editForm.conscientiousness} onChange={v => setEditForm({ ...editForm, conscientiousness: v })} />
                <TraitSlider label="外向性" val={editForm.extraversion} onChange={v => setEditForm({ ...editForm, extraversion: v })} />
                <TraitSlider label="宜人性" val={editForm.agreeableness} onChange={v => setEditForm({ ...editForm, agreeableness: v })} />
                <TraitSlider label="神经质" val={editForm.neuroticism} onChange={v => setEditForm({ ...editForm, neuroticism: v })} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>背景故事</label>
              <textarea className="form-input" value={editForm.backstory}
                onChange={e => setEditForm({ ...editForm, backstory: e.target.value })} rows={3} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowEdit(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
