import { useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
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

let socket: any = null;
try { socket = io('/', { transports: ['websocket', 'polling'] }); } catch {};

export default function App() {
  const {
    world, worlds, setWorld, setWorlds, setCharacters, setEvents,
    activeTab, setActiveTab, showCreateWorld, setShowCreateWorld,
    showCreateChar, setShowCreateChar, characters, events, isRunning,
    clearEvents, setCurrentTick, selectedLocation
  } = useStore();

  // 从后端重新加载数据
  const refreshData = useCallback(() => {
    if (!world) return;
    characterApi.list(world.id).then(list => {
      if (list.length > 0 || useStore.getState().characters.length === 0) {
        setCharacters(list);
      }
    });
    eventApi.list(world.id, { limit: 200 }).then(list => setEvents(list));
    worldApi.get(world.id).then(w => {
      if (w) { setWorld(w); setCurrentTick(w.time.tick); }
    });
  }, [world?.id]);

  // 初始加载——始终从服务端同步
  useEffect(() => {
    worldApi.list().then(ws => {
      setWorlds(ws);
      if (ws.length > 0) {
        const currentId = useStore.getState().world?.id;
        const stillExists = ws.find(w => w.id === currentId);
        if (!stillExists) {
          setWorld(ws[0]);
        }
      }
    });
  }, []);

  // Socket.io 监听 tick 完成事件（自动刷新数据）
  useEffect(() => {
    if (!socket) return;
    const onTickComplete = (result: any) => {
      if (result.personalityChanges) {
        useStore.getState().setPersonalityChanges(result.personalityChanges);
        setTimeout(() => useStore.getState().setPersonalityChanges({}), 10000);
      }
      const w = useStore.getState().world;
      if (w) {
        eventApi.list(w.id, { limit: 200 }).then(list => useStore.getState().setEvents(list));
        characterApi.list(w.id).then(list => useStore.getState().setCharacters(list));
        if (result.tick) useStore.getState().setCurrentTick(result.tick);
      }
    };
    socket.on('tick:complete', onTickComplete);
    return () => { socket.off('tick:complete', onTickComplete); };
  }, []);

  // 世界切换时加载数据
  useEffect(() => {
    if (!world) return;
    characterApi.list(world.id).then(setCharacters);
    eventApi.list(world.id, { limit: 200 }).then(setEvents);
    setCurrentTick(world.time.tick);
  }, [world?.id]);

  const handleTick = async () => {
    if (!world) return;
    const result = await simulationApi.tick(world.id);
    if (result.personalityChanges) {
      useStore.getState().setPersonalityChanges(result.personalityChanges);
      setTimeout(() => useStore.getState().setPersonalityChanges({}), 10000);
    }
    refreshData();
    setCurrentTick(result.tick);
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

  const filteredEvents = selectedLocation
    ? events.filter(e => e.locationId === selectedLocation)
    : events;

  // 没有世界时显示创建界面
  if (worlds.length === 0) {
    return (
      <div className="app-layout">
        <div className="top-bar"><h1>AI 虚拟世界小说模拟器</h1></div>
        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>欢迎来到 AI 虚拟世界</h2>
          <p style={{ marginBottom: 12 }}>创建一个新世界，开始你的小说创作之旅</p>
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
          <button className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            onClick={handleTick} disabled={isRunning}>步进</button>
          {!isRunning ? (
            <button className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
              onClick={handleStartAuto}>自动</button>
          ) : (
            <button className="btn" style={{ background: '#DC2626', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
              onClick={handleStop}>停止</button>
          )}
          <select className="form-input" style={{ width: 130, background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontSize: 12 }}
            value={world?.id} onChange={e => {
              const w = worlds.find(x => x.id === e.target.value);
              if (w) setWorld(w);
            }}>
            {worlds.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button className="btn" style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', fontSize: 11 }}
            onClick={refreshData}>刷新</button>
        </div>
      </div>

      <div className="main-content">
        {/* 侧边栏 */}
        <div className="sidebar">
          <h3>角色</h3>
          <div className="character-list">
            {characters.map(c => (
              <div key={c.id} className="character-item" style={{ cursor: 'pointer' }}
                onClick={() => { useStore.getState().setSelectedCharacterId(c.id); setActiveTab('characters'); }}>
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
            <button className="btn" style={{ width: '100%', marginTop: 6 }}
              onClick={() => setShowCreateChar(true)}>+ 添加角色</button>
          </div>

          <h3>地点</h3>
          <div className="location-list">
            {world?.locations?.map(loc => (
              <div key={loc.id}
                className={`location-item ${selectedLocation === loc.id ? 'active' : ''}`}
                onClick={() => useStore.getState().setSelectedLocation(loc.id === selectedLocation ? null : loc.id)}>
                {loc.name}
              </div>
            ))}
          </div>
        </div>

        {/* 主内容 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'characters' && <CharacterManager />}
          {activeTab === 'timeline' && <Timeline />}
          {activeTab === 'relationships' && <RelationshipGraph />}
          {activeTab === 'world' && <WorldEditor />}
          {activeTab === 'export' && <StoryExport />}
          {activeTab === 'settings' && <Settings />}
        </div>
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
