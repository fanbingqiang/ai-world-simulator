import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { eventApi } from '../api/client';

export default function Dashboard() {
  const { events, characters, world, personalityChanges, setPersonalityChanges, clearEvents } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [eventText, setEventText] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const displayEvents = showAll
    ? events
    : events.filter(e => e.category === 'user-intervention' || e.severity === 'significant' || e.severity === 'major' || e.severity === 'pivotal');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length, summary]);

  const getCharById = (id: string) => characters.find(c => c.id === id);

  const handleManualEvent = async () => {
    const text = eventText.trim();
    if (!text || !world) return;
    try {
      const newEvent = await eventApi.createManual({
        worldId: world.id,
        tick: world.time.tick,
        severity: 'minor',
        title: text.substring(0, 30),
        summary: text,
        description: text,
        locationId: world.locations[0]?.id || '',
        tags: ['user-input']
      });
      setEventText('');
      const { events: currentEvents, setEvents } = useStore.getState();
      setEvents([...currentEvents, newEvent]);
    } catch (err) {
      console.error('Failed to create event', err);
    }
  };

  const handleClear = async () => {
    if (!world || events.length === 0) return;

    // 统计事件，生成总结
    const tickSet = new Set(events.map(e => e.tick));
    const conflictCount = events.filter(e => e.category === 'conflict').length;
    const dialogueCount = events.filter(e => e.category === 'dialogue' || e.dialogue?.length > 0).length;
    const actionCount = events.filter(e => e.category === 'character-action').length;
    const worldEventCount = events.filter(e => e.category === 'world-event').length;

    // 收集参与的角色名
    const charIds = new Set(events.flatMap(e => e.participantIds || []));
    const charNames = [...charIds].map(id => getCharById(id)?.name).filter(Boolean);
    const uniqueNames = [...new Set(charNames)];

    // 生成总结文本
    const parts: string[] = [];
    if (tickSet.size > 0) parts.push(`经历了 ${tickSet.size} 个时间步`);
    if (conflictCount > 0) parts.push(`${conflictCount} 次冲突`);
    if (dialogueCount > 0) parts.push(`${dialogueCount} 次对话`);
    if (actionCount > 0) parts.push(`${actionCount} 次行动`);
    if (worldEventCount > 0) parts.push(`${worldEventCount} 个世界事件`);
    const summaryText = parts.length > 0 ? parts.join('，') + '。' : '没有重要事件。';
    const charPart = uniqueNames.length > 0 ? `涉及角色：${uniqueNames.slice(0, 5).join('、')}${uniqueNames.length > 5 ? '等' : ''}。` : '';
    const fullSummary = `${summaryText}${charPart}`;

    // 先清空服务端
    try { await eventApi.clear(world.id); } catch { /* ignore */ }

    clearEvents();
    setSummary(fullSummary);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>叙事流</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>
            {showAll ? `全部 ${events.length}` : `重要 ${displayEvents.length}`} 个事件
          </span>
          <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }}
            onClick={() => setShowAll(!showAll)}>
            {showAll ? '只看重要' : '显示全部'}
          </button>
          {events.length > 0 && (
            <button className="btn btn-warning" onClick={handleClear}
              style={{ fontSize: 11, padding: '3px 10px' }}>清空</button>
          )}
        </div>
      </div>

      {/* 性格进化提示 */}
      {Object.keys(personalityChanges).length > 0 && (
        <div className="evolution-bar">
          <span>角色性格已演化</span>
          <span style={{ fontSize: 11, color: '#64748B', marginLeft: 8 }}>
            {Object.keys(personalityChanges).map(cid => {
              const char = getCharById(cid);
              return <span key={cid} style={{ marginRight: 10 }}>{char?.name || '?'}</span>;
            })}
            可前往角色管理查看详情
          </span>
        </div>
      )}

      <div className="narrative-flow">
        {/* 总结事件卡片 */}
        {summary && (
          <div className="event-card" style={{ borderLeft: '3px solid #16A34A', background: '#F0FDF4' }}>
            <div className="event-header">
              <span className="tick-badge" style={{ background: '#16A34A', color: 'white' }}>总结</span>
              <span style={{ fontSize: 11, color: '#166534' }}>历史回顾</span>
            </div>
            <div className="event-summary" style={{ fontSize: 13, color: '#166534', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {summary.split('。').filter(Boolean).map((s, i) => <div key={i} style={{ marginBottom: 2 }}>{s}。</div>)}
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn" style={{ fontSize: 11, padding: '2px 10px', borderColor: '#16A34A', color: '#16A34A' }}
                onClick={() => setSummary(null)}>关闭</button>
            </div>
          </div>
        )}

        {displayEvents.length === 0 && !summary && (
          <div className="empty-state">
            <p>还没有重要事件发生</p>
            {events.length > 0 && <p style={{ fontSize: 12 }}>当前有 {events.length} 个普通事件，点击"显示全部"查看</p>}
            {events.length === 0 && <p style={{ fontSize: 12 }}>点击顶部「步进」按钮推进时间，或在下方输入框手动触发事件</p>}
          </div>
        )}
        {displayEvents.slice().reverse().map(evt =>
          evt.category === 'dialogue' && evt.dialogue?.some((d: any) => !d.isInternalThought)
            ? (
              <div key={evt.id} className="dialogue-card">
                <div className="event-header">
                  <span className="tick-badge">Tick {evt.tick}</span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>对话</span>
                </div>
                <div className="dialogue-bubbles">
                  {evt.dialogue?.filter((d: any) => !d.isInternalThought).map((d: any, i: number) => (
                    <div key={i} className="dialogue-bubble">
                      <div className="bubble-speaker">{getCharById(d.speakerId)?.name || d.speakerName}</div>
                      <div className="bubble-text">{d.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div key={evt.id} className="event-card">
                <div className="event-header">
                  <span className="tick-badge">Tick {evt.tick}</span>
                  <span className={`severity-badge severity-${evt.severity}`}>{evt.severity}</span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>{evt.category}</span>
                </div>
                <div className="event-title">{evt.title}</div>
                <div className="event-summary">{evt.description || evt.summary}</div>
                {evt.dialogue?.map((d: any, i: number) => (
                  d.isInternalThought ? (
                    <div key={i} className="internal-thought">[{getCharById(d.speakerId)?.name || d.speakerName} 内心] {d.content}</div>
                  ) : (
                    <div key={i} className="event-dialogue dialogue-line">
                      <span className="speaker">{getCharById(d.speakerId)?.name || d.speakerName}</span>（{d.emotion}）：{d.content}
                    </div>
                  )
                ))}
              </div>
            )
        )}
        <div ref={bottomRef} />
      </div>

      {/* 手动事件输入 */}
      <div className="event-input-area">
        <input
          value={eventText}
          onChange={e => setEventText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleManualEvent(); }}
          placeholder="输入事件描述，按 Enter 触发..."
        />
        <button className="btn btn-primary" onClick={handleManualEvent} disabled={!eventText.trim()}>
          触发
        </button>
      </div>
    </div>
  );
}
