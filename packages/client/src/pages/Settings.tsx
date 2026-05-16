import { useStore } from '../store';
import { worldApi } from '../api/client';

export default function Settings() {
  const { world, setWorld } = useStore();

  const updateSettings = async (key: string, value: any) => {
    if (!world) return;
    const newSettings = { ...world.settings, [key]: value };
    try {
      const updated = await worldApi.update(world.id, { settings: newSettings });
      setWorld(updated);
    } catch (err) {
      console.error('Failed to update settings', err);
    }
  };

  if (!world) return null;

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>设置</h2>

      <div className="char-card" style={{ maxWidth: 500 }}>
        <div className="form-group">
          <label>模拟速度（ms/tick）</label>
          <input type="number" className="form-input" value={world.settings.simulationSpeed}
            onChange={e => updateSettings('simulationSpeed', parseInt(e.target.value) || 1000)} />
        </div>

        <div className="form-group">
          <label>AI 创造度（0-2）</label>
          <input type="number" className="form-input" value={world.settings.aiTemperature}
            step="0.1" min="0" max="2"
            onChange={e => updateSettings('aiTemperature', parseFloat(e.target.value) || 1.2)} />
        </div>

        <div className="form-group">
          <label>最大角色数</label>
          <input type="number" className="form-input" value={world.settings.maxCharacters}
            onChange={e => updateSettings('maxCharacters', parseInt(e.target.value) || 10)} />
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="autoAdvance" checked={world.settings.autoAdvance}
            onChange={e => updateSettings('autoAdvance', e.target.checked)} />
          <label htmlFor="autoAdvance" style={{ margin: 0 }}>自动推进</label>
        </div>

        <div style={{ marginTop: 24, padding: 12, background: '#FFF3CD', borderRadius: 8, fontSize: 13 }}>
          <strong>提示：</strong>使用 DeepSeek API 需要先在 <code>.env</code> 文件中设置 <code>DEEPSEEK_API_KEY</code>。
        </div>
      </div>
    </div>
  );
}
