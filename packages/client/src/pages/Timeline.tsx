import { useState } from 'react';
import { useStore } from '../store';

export default function Timeline() {
  const { events } = useStore();
  const [filter, setFilter] = useState('all');
  const [severity, setSeverity] = useState('all');

  const filtered = events.filter(e => {
    if (filter !== 'all' && e.category !== filter) return false;
    if (severity !== 'all' && e.severity !== severity) return false;
    return true;
  });

  // 按 tick 分组
  const groups = filtered.reduce((acc, e) => {
    const key = `Tick ${e.tick}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, typeof events>);

  return (
    <div className="page">
      <div className="panel-header" style={{ padding: '0 0 16px 0' }}>
        <h2>时间线</h2>
      </div>

      <div className="timeline-controls">
        <select className="form-input" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">所有类型</option>
          <option value="character-action">角色行动</option>
          <option value="dialogue">对话</option>
          <option value="conflict">冲突</option>
          <option value="world-event">世界事件</option>
          <option value="user-intervention">用户干预</option>
        </select>
        <select className="form-input" style={{ width: 140 }} value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="all">所有等级</option>
          <option value="trivial">琐碎</option>
          <option value="minor">轻微</option>
          <option value="significant">重要</option>
          <option value="major">重大</option>
          <option value="pivotal">关键</option>
        </select>
      </div>

      {Object.entries(groups).reverse().map(([tick, evts]) => (
        <div key={tick} className="tick-group">
          <h3>{tick}（{evts.length} 个事件）</h3>
          {evts.reverse().map(evt => (
            <div key={evt.id} className="event-card">
              <div className="event-header">
                <span className={`severity-badge severity-${evt.severity}`}>{evt.severity}</span>
                <span style={{ fontSize: 12, color: '#7F8C8D' }}>{evt.category}</span>
              </div>
              <div className="event-title">{evt.title}</div>
              <div className="event-summary">{evt.summary}</div>
              {evt.dialogue?.map((d, i) => (
                <div key={i} className="event-dialogue dialogue-line">
                  <span className="speaker">{d.speakerName}</span>：{d.content}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="empty-state"><p>没有匹配的事件</p></div>
      )}
    </div>
  );
}
