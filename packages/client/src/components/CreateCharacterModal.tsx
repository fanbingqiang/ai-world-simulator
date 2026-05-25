import { useState } from 'react';
import { useStore } from '../store';
import { characterApi } from '../api/client';

const PRESET_TRAITS = ['勇敢', '狡猾', '善良', '固执', '多疑', '乐观', '悲观', '冲动', '谨慎', '傲慢', '谦逊', '热情', '冷漠', '诚实', '阴险'];

function TraitSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="form-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span>{label}</span>
        <span style={{ color: '#2563EB', fontWeight: 600 }}>{value}</span>
      </div>
      <input type="range" min="0" max="100" value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: '100%' }} />
    </div>
  );
}

export default function CreateCharacterModal() {
  const { world, addCharacter, setShowCreateChar } = useStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    age: 25,
    role: '',
    backstory: '',
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 50,
    traits: [] as string[],
    customTrait: '',
    moralAlignment: 'true-neutral',
    secrets: '',
    locationId: ''
  });

  const toggleTrait = (t: string) => {
    setForm(f => ({
      ...f,
      traits: f.traits.includes(t) ? f.traits.filter(x => x !== t) : [...f.traits, t]
    }));
  };

  const addCustomTrait = () => {
    const t = form.customTrait.trim();
    if (t && !form.traits.includes(t)) {
      setForm(f => ({ ...f, traits: [...f.traits, t], customTrait: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!world) return;
    setLoading(true);
    try {
      const locId = form.locationId || world.locations[0]?.id || '';
      const char = await characterApi.create({
        worldId: world.id,
        name: form.name,
        age: form.age,
        role: form.role,
        backstory: form.backstory,
        personality: {
          openness: form.openness,
          conscientiousness: form.conscientiousness,
          extraversion: form.extraversion,
          agreeableness: form.agreeableness,
          neuroticism: form.neuroticism
        },
        traits: form.traits,
        moralAlignment: form.moralAlignment,
        secrets: form.secrets ? [{ content: form.secrets, knownBy: [], importance: 50, isRevealed: false }] : [],
        currentLocation: locId
      });
      addCharacter(char);
      setShowCreateChar(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setShowCreateChar(false)}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <h2>创建角色</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div className="form-group">
              <label>角色名</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例如：凯尔" />
            </div>
            <div className="form-group">
              <label>年龄</label>
              <input type="number" className="form-input" value={form.age} onChange={e => setForm({ ...form, age: parseInt(e.target.value) || 25 })} />
            </div>
            <div className="form-group">
              <label>身份/职业</label>
              <input className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="例如：流浪剑客" />
            </div>
            <div className="form-group">
              <label>初始地点</label>
              <select className="form-input" value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value })}>
                <option value="">默认地点</option>
                {world?.locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>道德倾向</label>
              <select className="form-input" value={form.moralAlignment} onChange={e => setForm({ ...form, moralAlignment: e.target.value })}>
                <option value="lawful-good">守序善良</option>
                <option value="neutral-good">中立善良</option>
                <option value="chaotic-good">混乱善良</option>
                <option value="lawful-neutral">守序中立</option>
                <option value="true-neutral">绝对中立</option>
                <option value="chaotic-neutral">混乱中立</option>
                <option value="lawful-evil">守序邪恶</option>
                <option value="neutral-evil">中立邪恶</option>
                <option value="chaotic-evil">混乱邪恶</option>
              </select>
            </div>
            <div className="form-group">
              <label>秘密</label>
              <textarea className="form-input" value={form.secrets} onChange={e => setForm({ ...form, secrets: e.target.value })} placeholder="角色隐藏的秘密..." />
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 12, marginBottom: 8, color: '#64748B' }}>性格特征（五维度）</h4>
            <TraitSlider label="开放性（好奇心）" value={form.openness} onChange={v => setForm({ ...form, openness: v })} />
            <TraitSlider label="尽责性（自律）" value={form.conscientiousness} onChange={v => setForm({ ...form, conscientiousness: v })} />
            <TraitSlider label="外向性（社交）" value={form.extraversion} onChange={v => setForm({ ...form, extraversion: v })} />
            <TraitSlider label="宜人性（友善）" value={form.agreeableness} onChange={v => setForm({ ...form, agreeableness: v })} />
            <TraitSlider label="神经质（敏感）" value={form.neuroticism} onChange={v => setForm({ ...form, neuroticism: v })} />

            <h4 style={{ fontSize: 12, marginBottom: 6, marginTop: 12, color: '#64748B' }}>性格标签</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
              {PRESET_TRAITS.map(t => (
                <span key={t}
                  style={{
                    padding: '2px 8px', borderRadius: 3, fontSize: 11, cursor: 'pointer',
                    background: form.traits.includes(t) ? '#2563EB' : '#F1F5F9',
                    color: form.traits.includes(t) ? 'white' : '#1E293B'
                  }}
                  onClick={() => toggleTrait(t)}>
                  {t}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              <input className="form-input" style={{ flex: 1, fontSize: 12 }}
                placeholder="自定义标签..."
                value={form.customTrait}
                onChange={e => setForm({ ...form, customTrait: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addCustomTrait()} />
              <button className="btn" type="button" onClick={addCustomTrait}>添加</button>
            </div>

            <div className="form-group">
              <label>背景故事</label>
              <textarea className="form-input" value={form.backstory}
                onChange={e => setForm({ ...form, backstory: e.target.value })}
                placeholder="角色的过去..." rows={3} />
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={() => setShowCreateChar(false)}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !form.name}>
            {loading ? '创建中...' : '创建角色'}
          </button>
        </div>
      </div>
    </div>
  );
}
