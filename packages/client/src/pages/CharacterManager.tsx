import { useState } from 'react';
import { useStore } from '../store';
import { characterApi } from '../api/client';

export default function CharacterManager() {
  const { characters, world, setCharacters, setShowCreateChar } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);

  const char = selected ? characters.find(c => c.id === selected) : null;

  const handleSave = async () => {
    if (!editing) return;
    await characterApi.update(editing.id, editing);
    const updated = await characterApi.list(world?.id);
    setCharacters(updated);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await characterApi.delete(id);
    const updated = await characterApi.list(world?.id);
    setCharacters(updated);
    if (selected === id) setSelected(null);
  };

  return (
    <div className="page" style={{ display: 'flex', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>角色管理</h2>
          <button className="btn btn-primary" onClick={() => setShowCreateChar(true)}>+ 创建角色</button>
        </div>
        <div className="char-grid">
          {characters.map(c => (
            <div key={c.id} className="char-card" onClick={() => { setSelected(c.id); setEditing(null); }}
              style={{ cursor: 'pointer', border: selected === c.id ? '2px solid #7BB8E8' : undefined }}>
              <div className="char-header">
                <div className="char-avatar">{c.name[0]}</div>
                <div>
                  <div className="char-name">{c.name}</div>
                  <div className="char-role">{c.role}</div>
                </div>
              </div>
              <div className="card-section">
                <h4>性格</h4>
                <div style={{ fontSize: 12 }}>
                  <span>开{c.personality.openness}</span>
                  <span style={{ marginLeft: 8 }}>尽{c.personality.conscientiousness}</span>
                  <span style={{ marginLeft: 8 }}>外{c.personality.extraversion}</span>
                  <span style={{ marginLeft: 8 }}>宜{c.personality.agreeableness}</span>
                  <span style={{ marginLeft: 8 }}>神{c.personality.neuroticism}</span>
                </div>
              </div>
              <div className="card-section">
                <h4>标签</h4>
                {c.traits.map((t, i) => <span key={i} className="trait-tag">{t}</span>)}
              </div>
              <div className="card-section">
                <h4>当前状态</h4>
                <div style={{ fontSize: 13 }}>情绪：{c.emotionalState.primary} | 精力：{c.energy} | 健康：{c.health}</div>
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

      {/* 角色详情面板 */}
      {char && (
        <div style={{ width: 360, flexShrink: 0 }}>
          <div className="char-card">
            <div className="char-header">
              <div className="char-avatar">{char.name[0]}</div>
              <div>
                <div className="char-name">{char.name}</div>
                <div className="char-role">{char.role}，{char.age}岁</div>
              </div>
            </div>

            <div className="card-section">
              <h4>背景故事</h4>
              <p style={{ fontSize: 13, color: '#7F8C8D' }}>{char.backstory || '暂无背景设定'}</p>
            </div>

            <div className="card-section">
              <h4>秘密</h4>
              {char.secrets.map((s, i) => (
                <div key={i} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid #E0E8F0' }}>
                  <span>{s.isRevealed ? '🔓' : '🔒'} {s.content}</span>
                  <span style={{ fontSize: 11, color: '#7F8C8D', marginLeft: 8 }}>重要性 {s.importance}%</span>
                </div>
              ))}
              {char.secrets.length === 0 && <p style={{ fontSize: 13, color: '#7F8C8D' }}>暂无秘密</p>}
            </div>

            <div className="card-section">
              <h4>关系</h4>
              {char.relationships.map((r, i) => {
                const other = characters.find(c => c.id === r.characterId);
                return (
                  <div key={i} style={{ fontSize: 13, padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{other?.name || '未知'}</span>
                    <span style={{ color: r.affinity >= 0 ? '#27AE60' : '#E74C3C' }}>
                      {r.type}（{r.affinity > 0 ? '+' : ''}{r.affinity}）
                    </span>
                  </div>
                );
              })}
              {char.relationships.length === 0 && <p style={{ fontSize: 13, color: '#7F8C8D' }}>暂无关系</p>}
            </div>

            <div className="card-section">
              <h4>记忆（最近5条）</h4>
              {char.memories.slice(-5).reverse().map(m => (
                <div key={m.id} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid #E0E8F0' }}>
                  <div>{m.title}</div>
                  <div style={{ fontSize: 11, color: '#7F8C8D' }}>Tick {m.tick} | 情绪：{m.emotionalImpact} | 重要度：{m.importance}</div>
                </div>
              ))}
              {char.memories.length === 0 && <p style={{ fontSize: 13, color: '#7F8C8D' }}>暂无记忆</p>}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-danger" onClick={() => handleDelete(char.id)}>删除角色</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
