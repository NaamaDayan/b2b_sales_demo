import { useState, useCallback } from 'react';
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
import './App.css';

export default function App() {
  const [requiresAttention, setRequiresAttention] = useState(REQUIRES_ATTENTION_INITIAL);
  const [underControl, setUnderControl] = useState(UNDER_CONTROL_INITIAL);
  const [done, setDone] = useState(DONE_INITIAL);
  const [trace, setTrace] = useState([]);
  const [executingTaskIds, setExecutingTaskIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('attention');
  const [chatModalTask, setChatModalTask] = useState(null);

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
            const taskToAdd = taskUpdate ? { ...taskToMove, ...taskUpdate } : taskToMove;
            if (moveTo === 'done') setDone((d) => [...d, taskToAdd]);
            if (moveTo === 'requiresAttention') setRequiresAttention((r) => [...r, taskToAdd]);
            return prev.filter((t) => t.id !== tid);
          });
        },
      };

      runTaskExecution(taskInControl, callbacks).then(() => {
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

  const tasksByTab = {
    attention: requiresAttention,
    control: underControl,
    done,
  };

  return (
    <div className="app-root">
      <main className="main-content">
        <h1 className="portal-title">Deal Execution Space — ACME</h1>
        <DealDetails />
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
