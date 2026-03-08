import { useState, useCallback, useEffect, useRef } from 'react';
import {
  REQUIRES_ATTENTION_INITIAL,
  UNDER_CONTROL_INITIAL,
  DONE_INITIAL,
} from './initialData';
import { runTaskExecution } from './agentWorkflows';
import DealDetails from './components/DealDetails';
import TabBar from './components/TabBar';
import TaskTable from './components/TaskTable';
import AgentTracePanel from './components/AgentTracePanel';
import ChatModal from './components/ChatModal';
import ReadinessMilestones from './components/ReadinessMilestones';
import './App.css';

function getRoomId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('room') || null;
}

const SAVE_DEBOUNCE_MS = 800;

export default function App() {
  const roomId = useRef(getRoomId());
  const [loading, setLoading] = useState(!!roomId.current);
  const [requiresAttention, setRequiresAttention] = useState(REQUIRES_ATTENTION_INITIAL);
  const [underControl, setUnderControl] = useState(UNDER_CONTROL_INITIAL);
  const [done, setDone] = useState(DONE_INITIAL);
  const [trace, setTrace] = useState([]);
  const [executingTaskIds, setExecutingTaskIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('attention');
  const [chatModalTask, setChatModalTask] = useState(null);

  const saveTimer = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ── Hydrate from server on mount ────────────────────────────────────────
  useEffect(() => {
    if (!roomId.current) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/room/${roomId.current}/state`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data) return;
        if (data.requiresAttention) setRequiresAttention(data.requiresAttention);
        if (data.underControl) setUnderControl(data.underControl);
        if (data.done) setDone(data.done);
        if (data.trace) setTrace(data.trace);
        if (data.executingTaskIds) setExecutingTaskIds(new Set(data.executingTaskIds));
        if (data.activeTab) setActiveTab(data.activeTab);
      } catch (err) {
        console.warn('[App] Failed to load room state:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Persist to server (debounced) ───────────────────────────────────────
  const persistState = useCallback((overrides = {}) => {
    if (!roomId.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const body = {
        requiresAttention,
        underControl,
        done,
        trace,
        executingTaskIds: [...executingTaskIds],
        activeTab,
        ...overrides,
      };
      fetch(`/api/room/${roomId.current}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch((err) => console.warn('[App] room state save failed:', err.message));
    }, SAVE_DEBOUNCE_MS);
  }, [requiresAttention, underControl, done, trace, executingTaskIds, activeTab]);

  // Save whenever state changes (after initial load)
  const hasHydrated = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
    persistState();
  }, [requiresAttention, underControl, done, trace, executingTaskIds, activeTab, loading, persistState]);

  const onTraceEntry = useCallback((entry) => {
    setTrace((prev) => [...prev, entry]);
  }, []);

  const handleExecute = useCallback(
    (task) => {
      if (executingTaskIds.has(task.id)) return;
      if (!requiresAttention.some((t) => t.id === task.id)) return;

      setExecutingTaskIds((prev) => new Set(prev).add(task.id));
      setRequiresAttention((prev) => prev.filter((t) => t.id !== task.id));
      setUnderControl((prev) => [...prev, { ...task }]);

      const taskInControl = { ...task };
      const callbacks = {
        onTraceEntry,
        onMoveTask: (tid, moveTo, taskUpdate) => {
          setExecutingTaskIds((prev) => {
            const next = new Set(prev);
            next.delete(tid);
            return next;
          });
          setUnderControl((prev) => {
            const taskToMove = prev.find((t) => t.id === tid);
            if (!taskToMove) return prev;
            let taskToAdd = taskUpdate ? { ...taskToMove, ...taskUpdate } : taskToMove;
            if (taskUpdate?.agentLogAppend) {
              taskToAdd = {
                ...taskToAdd,
                agentLog: [...(taskToMove.agentLog || []), ...taskUpdate.agentLogAppend],
              };
              delete taskToAdd.agentLogAppend;
            }
            if (moveTo === 'done') setDone((d) => [...d, taskToAdd]);
            if (moveTo === 'requiresAttention') setRequiresAttention((r) => [...r, taskToAdd]);
            return prev.filter((t) => t.id !== tid);
          });
        },
      };

      runTaskExecution(taskInControl, callbacks, roomId.current).then(() => {
        setExecutingTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      });
    },
    [executingTaskIds, requiresAttention, onTraceEntry]
  );

  const handleUpdateTask = useCallback((taskId, field, value) => {
    if (requiresAttention.some((t) => t.id === taskId)) {
      setRequiresAttention((prev) => prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)));
    }
    if (underControl.some((t) => t.id === taskId)) {
      setUnderControl((prev) => prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)));
    }
  }, []);

  if (loading) {
    return (
      <div className="app-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary, #888)', fontSize: '1.1rem' }}>Loading deal space...</p>
      </div>
    );
  }

  const tasksByTab = {
    attention: requiresAttention,
    control: underControl,
    done,
  };

  return (
    <div className="app-root">
      <main className="main-content">
        <div className="portal-header-row">
          <h1 className="portal-title">Deal Execution Space — ACME</h1>
          <a href="vp-sales" className="vp-nav-link">Pipeline (VP)</a>
        </div>
        <DealDetails />
        <ReadinessMilestones requiresAttention={requiresAttention} underControl={underControl} />
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{
            attention: requiresAttention.length,
            control: underControl.length,
            done: done.length,
          }}
        />
        <div className="portal-panels">
          <div
            id="panel-attention"
            className={`portal-panel ${activeTab === 'attention' ? 'active' : ''}`}
            role="tabpanel"
          >
            <TaskTable
              tasks={tasksByTab.attention}
              tabKey="attention"
              executingTaskIds={executingTaskIds}
              onExecute={handleExecute}
              onChat={setChatModalTask}
              onUpdateTask={handleUpdateTask}
            />
          </div>
          <div
            id="panel-control"
            className={`portal-panel ${activeTab === 'control' ? 'active' : ''}`}
            role="tabpanel"
          >
            <TaskTable
              tasks={tasksByTab.control}
              tabKey="control"
              executingTaskIds={executingTaskIds}
              onExecute={handleExecute}
              onChat={setChatModalTask}
              onUpdateTask={handleUpdateTask}
            />
          </div>
          <div
            id="panel-done"
            className={`portal-panel ${activeTab === 'done' ? 'active' : ''}`}
            role="tabpanel"
          >
            <TaskTable
              tasks={tasksByTab.done}
              tabKey="done"
              executingTaskIds={executingTaskIds}
              onExecute={handleExecute}
              onChat={setChatModalTask}
              onUpdateTask={handleUpdateTask}
            />
          </div>
        </div>
      </main>
      <AgentTracePanel trace={trace} executingTaskIds={executingTaskIds} />
      {chatModalTask && (
        <ChatModal task={chatModalTask} onClose={() => setChatModalTask(null)} />
      )}
    </div>
  );
}
