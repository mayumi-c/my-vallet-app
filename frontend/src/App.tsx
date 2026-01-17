import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';
import Auth from './Auth';
import PasswordReset from './PasswordReset';
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

  // --- Data Fetching ---
  const fetchTasks = async () => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
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

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !session?.user) return;
    try {
      console.log('Adding task for user:', session.user.id);
      const { data, error } = await supabase.from('tasks').insert({ 
        text: newTaskText, 
        status: 'pending',
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
  
  const handleRescheduleClick = (id: number) => {
    setReschedulingTask(id);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRescheduleDate(tomorrow.toISOString().split('T')[0]);
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
    const groups: { [key: string]: Task[] } = tasks.reduce((acc, task) => {
      let key = '今日のタスク'; // Default group for 'pending'
      if (task.status === 'rescheduled' && task.rescheduled_to) {
        key = task.rescheduled_to;
      } else if (task.status === 'completed') {
        key = '完了';
      }
      
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(task);
      return acc;
    }, {} as { [key: string]: Task[] });
    return groups;
  }, [tasks]);

  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedTasks).sort((a, b) => {
      if (a === '今日のタスク') return -1;
      if (b === '今日のタスク') return 1;
      if (a === '完了') return 1;
      if (b === '完了') return -1;
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
      <header className="app-header">
        <h1>My Bullet Journal</h1>
        <button onClick={handleLogout} className="logout-btn">ログアウト</button>
      </header>
      
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
                                <button onClick={() => handleRescheduleClick(task.id)} className="reschedule-btn">延期</button>
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