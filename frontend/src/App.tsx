import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';
import Auth from './Auth';
import PasswordReset from './PasswordReset';
import Settings from './Settings';
import './App.css';

interface Task {
  id: number;
  text: string;
  status: 'pending' | 'completed' | 'rescheduled';
  rescheduled_to?: string;
  created_at: string;
  user_id: string; // Add user_id to interface
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isPasswordResetting, setIsPasswordResetting] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [reschedulingTask, setReschedulingTask] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [displayDate, setDisplayDate] = useState(new Date());
  const [theme, setTheme] = useState('theme-dark-blue');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      setSession(session);
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordResetting(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  // --- Data Fetching ---
  const fetchTasks = async () => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'completed')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase fetch error:', error);
        alert(`タスクの取得に失敗しました: ${error.message}`);
        throw error;
      }
      console.log('Fetched tasks:', data);
      setTasks(data as Task[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchTasks();
    }
  }, [session]);

  // --- Event Handlers ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTasks([]);
  };

  const displayDateString = displayDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const handlePrevDay = () => {
    const newDate = new Date(displayDate);
    newDate.setDate(newDate.getDate() - 1);
    setDisplayDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(displayDate);
    newDate.setDate(newDate.getDate() + 1);
    setDisplayDate(newDate);
  };

  const handleToday = () => {
    setDisplayDate(new Date());
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !session?.user) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const displayDateNormalized = new Date(displayDate);
    displayDateNormalized.setHours(0, 0, 0, 0);

    let status: 'pending' | 'rescheduled' = 'pending';
    let rescheduled_to: string | undefined = undefined;

    if (displayDateNormalized.getTime() !== today.getTime()) {
      status = 'rescheduled';
      rescheduled_to = displayDate.toISOString().split('T')[0];
    }

    try {
      console.log('Adding task for user:', session.user.id);
      const { data, error } = await supabase.from('tasks').insert({ 
        text: newTaskText, 
        status: status,
        rescheduled_to: rescheduled_to,
        user_id: session.user.id 
      }).select();
      
      if (error) {
        console.error('Supabase insert error:', error);
        alert(`タスクの追加に失敗しました: ${error.message}`);
        throw error;
      }
      
      const newTask = data ? data[0] : null;
      console.log('Inserted task:', newTask);
      if (newTask) {
        setTasks((prevTasks) => [...prevTasks, newTask]);
        setNewTaskText('');
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const updateTask = async (id: number, updates: Partial<Pick<Task, 'status' | 'rescheduled_to'>>) => {
    try {
      const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select();
      if (error) throw error;
      const updatedTask = data ? data[0] : null;
      if (updatedTask) {
        setTasks((prevTasks) => prevTasks.map((task) => (task.id === id ? updatedTask : task)));
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };
  
  const handleComplete = (id: number) => {
    updateTask(id, { status: 'completed' });
  };
  
  const handleChangeDateClick = (id: number) => {
    const taskToChange = tasks.find(t => t.id === id);
    if (!taskToChange) return;

    setReschedulingTask(id);
    
    if (taskToChange.status === 'rescheduled' && taskToChange.rescheduled_to) {
      setRescheduleDate(taskToChange.rescheduled_to);
    } else {
      // It's a 'pending' task, so its date is today.
      setRescheduleDate(new Date().toISOString().split('T')[0]);
    }
  };

  const handleSaveReschedule = (id: number) => {
    if (!rescheduleDate) return;
    updateTask(id, { status: 'rescheduled', rescheduled_to: rescheduleDate });
    setReschedulingTask(null);
    setRescheduleDate('');
  };

  const handleCancelReschedule = () => {
    setReschedulingTask(null);
    setRescheduleDate('');
  };

  // --- Render Logic ---
  const groupedTasks = useMemo(() => {
    const displayDateStr = displayDate.toISOString().split('T')[0];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tasksForView = tasks.filter(task => {
      if (task.status === 'rescheduled' && task.rescheduled_to === displayDateStr) {
        return true;
      }
      if (task.status === 'pending' && displayDateStr === todayStr) {
        return true;
      }
      return false;
    });

    const groups: { [key:string]: Task[] } = {};
    for (const task of tasksForView) {
      const key = task.status === 'pending' ? '今日のタスク' : task.rescheduled_to!;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    }
    return groups;

  }, [tasks, displayDate]);

  const sortedGroupKeys = useMemo(() => {
    // When viewing today, we might have "今日のタスク" and a date string for today.
    // We want "今日のタスク" to come first.
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    return Object.keys(groupedTasks).sort((a, b) => {
      if (a === '今日のタスク') return -1;
      if (b === '今日のタスク') return 1;
      // if a is today's date string and b is not "今日のタスク"
      if (a === todayStr && b !== '今日のタスク') return -1;
      if (b === todayStr && a !== '今日のタスク') return 1;
      return new Date(a).getTime() - new Date(b).getTime();
    });
  }, [groupedTasks]);

  if (isPasswordResetting) {
    return (
      <PasswordReset 
        onSuccess={() => setIsPasswordResetting(false)} 
        onCancel={() => setIsPasswordResetting(false)} 
      />
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="App">
      <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>⚙️</button>
      {showSettings && <Settings setTheme={setTheme} onClose={() => setShowSettings(false)} />}
      <header className="app-header">
        <h1>My Bullet Journal</h1>
        <button onClick={handleLogout} className="logout-btn">ログアウト</button>
      </header>

      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h2>{displayDateString}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button onClick={handlePrevDay}>‹ 前日</button>
          <button onClick={handleToday}>今日</button>
          <button onClick={handleNextDay}>翌日 ›</button>
        </div>
      </div>
      
      <form onSubmit={addTask} className="task-form">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="新しいタスクを追加..."
        />
        <button type="submit">追加</button>
      </form>

      <div className="task-container">
        {sortedGroupKeys.map(groupKey => (
          <div className="task-section" key={groupKey}>
            <h2>{groupKey}</h2>
            <ul className="task-list">
              {groupedTasks[groupKey].map((task) => (
                <li key={task.id} className={task.status === 'completed' ? 'completed' : ''}>
                  {reschedulingTask === task.id ? (
                    <>
                      <input 
                        type="date" 
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="reschedule-input"
                      />
                      <div className="task-actions">
                        <button onClick={() => handleSaveReschedule(task.id)} className="save-btn">保存</button>
                        <button onClick={handleCancelReschedule} className="cancel-btn">中止</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span>{task.text}</span>
                      {task.status !== 'completed' && (
                         <div className="task-actions">
                            <button onClick={() => handleComplete(task.id)} className="complete-btn">完了</button>
                            {task.status !== 'rescheduled' && (
                                <button onClick={() => handleChangeDateClick(task.id)} className="change-date-btn">変更</button>
                            )}
                         </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;