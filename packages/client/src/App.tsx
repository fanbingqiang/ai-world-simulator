import { useEffect, useState } from 'react';
import { useStore } from './store';
import { worldApi, characterApi, eventApi, simulationApi } from './api/client';
import Dashboard from './pages/Dashboard';
import CharacterManager from './pages/CharacterManager';
import Timeline from './pages/Timeline';
import RelationshipGraph from './pages/RelationshipGraph';
import WorldEditor from './pages/WorldEditor';
import StoryExport from './pages/StoryExport';
import Settings from './pages/Settings';
import CreateWorldModal from './components/CreateWorldModal';
import CreateCharacterModal from './components/CreateCharacterModal';

export default function App() {
  const {
    world, worlds, setWorld, setWorlds, setCharacters, setEvents,
    activeTab, setActiveTab, showCreateWorld, setShowCreateWorld,
    showCreateChar, setShowCreateChar, characters, events, isRunning,
    clearEvents, setCurrentTick
  } = useStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    worldApi.list().then(ws => {
      setWorlds(ws);
      if (ws.length > 0) setWorld(ws[0]);
    }).finally(() => setLoading(false));
  }, []);

  // 切换世界时加载角色和事件
  useEffect(() => {
    if (!world) return;
    characterApi.list(world.id).then(setCharacters);
    eventApi.list(world.id, { limit: 100 }).then(setEvents);
    setCurrentTick(world.time.tick);
  }, [world?.id]);

  const handleTick = async () => {
    if (!world) return;
    const result = await simulationApi.tick(world.id);
    setEvents([...result.events, ...events].slice(-200));
    setCurrentTick(result.tick);
    if (result.characterUpdates) {
      for (const [id, data] of Object.entries(result.characterUpdates)) {
        useStore.getState().updateCharacter(id, data as any);
      }
    }
  };

  const handleStartAuto = async () => {
    if (!world) return;
    useStore.getState().setIsRunning(true);
    await simulationApi.start(world.id);
  };

  const handleStop = async () => {
    await simulationApi.stop();
    useStore.getState().setIsRunning(false);
  };

  if (loading) return <div className="app-layout" style={{ alignItems: 'center', justifyContent: 'center' }}><p>加载中...</p></div>;

  // 没有世界时显示创建界面
  if (worlds.length === 0) {
    return (
      <div className="app-layout">
        <div className="top-bar"><h1>AI 虚拟世界小说模拟器</h1></div>
        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2>欢迎来到 AI 虚拟世界</h2>
          <p>创建一个新世界，开始你的小说创作之旅</p>
          <button className="btn btn-primary" onClick={() => setShowCreateWorld(true)}>创建新世界</button>
        </div>
        {showCreateWorld && <CreateWorldModal />}
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* 顶部导航 */}
      <div className="top-bar">
        <h1>{world?.name || 'AI 虚拟世界'}</h1>
        <div className="controls">
          <span className="time-display">
            Tick {world?.time?.tick || 0} | {world?.time?.dayPeriod} | {world?.time?.season}
          </span>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
            onClick={handleTick} disabled={isRunning}>步进</button>
          {!isRunning ? (
            <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
              onClick={handleStartAuto}>自动</button>
          ) : (
            <button className="btn btn-danger" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={handleStop}>停止</button>
          )}
          <select className="form-input" style={{ width: 140, background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            value={world?.id} onChange={e => {
              const w = worlds.find(x => x.id === e.target.value);
              if (w) setWorld(w);
            }}>
            {worlds.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      <div className="main-content">
        {/* 侧边栏 */}
        <div className="sidebar">
          <h3>角色</h3>
          <div className="character-list">
            {characters.map(c => (
              <div key={c.id} className="character-item">
                <div className="avatar">
                  {c.avatarUrl ? <img src={c.avatarUrl} alt={c.name} /> : c.name[0]}
                </div>
                <div className="info">
                  <div className="name">{c.name}</div>
                  <div className="status">{c.role} | 精力 {c.energy}</div>
                </div>
                <div className="emotion">{c.emotionalState?.primary}</div>
              </div>
            ))}
            <button className="btn" style={{ width: '100%', marginTop: 8 }}
              onClick={() => useStore.getState().setShowCreateChar(true)}>+ 添加角色</button>
          </div>

          <h3>地点</h3>
          <div className="location-list">
            {world?.locations?.map(loc => (
              <div key={loc.id}
                className={`location-item ${useStore.getState().selectedLocation === loc.id ? 'active' : ''}`}
                onClick={() => useStore.getState().setSelectedLocation(loc.id)}>
                {loc.name}
              </div>
            ))}
          </div>
        </div>

        {/* 主内容 */}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'characters' && <CharacterManager />}
        {activeTab === 'timeline' && <Timeline />}
        {activeTab === 'relationships' && <RelationshipGraph />}
        {activeTab === 'world' && <WorldEditor />}
        {activeTab === 'export' && <StoryExport />}
        {activeTab === 'settings' && <Settings />}
      </div>

      {/* 底部导航 */}
      <div className="bottom-nav">
        {[
          { key: 'dashboard', label: '主面板' },
          { key: 'characters', label: '角色' },
          { key: 'timeline', label: '时间线' },
          { key: 'relationships', label: '关系图' },
          { key: 'world', label: '世界' },
          { key: 'export', label: '导出' },
          { key: 'settings', label: '设置' },
        ].map(tab => (
          <button key={tab.key}
            className={`nav-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {showCreateWorld && <CreateWorldModal />}
      {showCreateChar && <CreateCharacterModal />}
    </div>
  );
}
