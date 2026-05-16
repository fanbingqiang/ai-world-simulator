import { useEffect, useRef } from 'react';
import { useStore } from '../store';

export default function Dashboard() {
  const { events, characters } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  const getCharById = (id: string) => characters.find(c => c.id === id);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>叙事流</h2>
        <span style={{ fontSize: 13, color: '#7F8C8D' }}>共 {events.length} 个事件</span>
      </div>
      <div className="narrative-flow">
        {events.length === 0 && (
          <div className="empty-state">
            <p>还没有事件发生</p>
            <p style={{ fontSize: 13 }}>点击顶部「步进」按钮推进时间，或点击「自动」让世界自动运行</p>
          </div>
        )}
        {events.slice().reverse().map(evt => (
          <div key={evt.id} className="event-card">
            <div className="event-header">
              <span className="tick-badge">Tick {evt.tick}</span>
              <span className={`severity-badge severity-${evt.severity}`}>{evt.severity}</span>
              <span style={{ fontSize: 12, color: '#7F8C8D' }}>{evt.category}</span>
            </div>
            <div className="event-title">{evt.title}</div>
            <div className="event-summary">{evt.summary}</div>
            {evt.dialogue?.map((d, i) => (
              d.isInternalThought ? (
                <div key={i} className="internal-thought">[{getCharById(d.speakerId)?.name || d.speakerName} 内心] {d.content}</div>
              ) : (
                <div key={i} className="event-dialogue dialogue-line">
                  <span className="speaker">{getCharById(d.speakerId)?.name || d.speakerName}</span>（{d.emotion}）：{d.content}
                </div>
              )
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
