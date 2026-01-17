import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

interface Task {
  id: number;
  text: string;
  status: 'pending' | 'completed' | 'rescheduled';
  rescheduled_to?: string;
  created_at: string;
  user_id: string;
}

interface TaskBoardProps {
  session: any;
}

export default function TaskBoard({ session }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [reschedulingTask, setReschedulingTask] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  // --- Data Fetching ---
  const fetchTasks = async () => {
    if (!session?.user) return;
    try {
      // 完了していないタスクのみ取得
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'completed') 
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTasks(data as Task[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [session]);

  // --- Logic: 50件制限のチェックと削除 ---
  const cleanUpOldCompletedTasks = async () => {
    try {
      // 1. 完了タスクを古い順に取得
      const { data: completedTasks, error } = await supabase
        .from('tasks')
        .select('id')
        .eq('status', 'completed')
        .order('created_at', { ascending: true }); // 古い順

      if (error || !completedTasks) return;

      const limit = 50;
      if (completedTasks.length > limit) {
        // 2. 削除対象の特定 (古い方から超過分)
        const deleteCount = completedTasks.length - limit;
        const toDeleteIds = completedTasks.slice(0, deleteCount).map(t => t.id);

        console.log(`Deleting ${deleteCount} old tasks...`);

        // 3. 削除実行
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .in('id', toDeleteIds);
        
        if (deleteError) console.error('Error cleaning up tasks:', deleteError);
      }
    } catch (err) {
      console.error('Cleanup failed:', err);
    }
  };

  // --- Event Handlers ---
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !session?.user) return;
    try {
      const { data, error } = await supabase.from('tasks').insert({ 
        text: newTaskText, 
        status: 'pending',
        user_id: session.user.id 
      }).select();
      
      if (error) throw error;
      const newTask = data ? data[0] : null;
      if (newTask) {
        setTasks((prevTasks) => [...prevTasks, newTask]);
        setNewTaskText('');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      alert('タスクの追加に失敗しました。');
    }
  };

  const updateTask = async (id: number, updates: Partial<Pick<Task, 'status' | 'rescheduled_to'>>) => {
    try {
      const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select();
      if (error) throw error;
      
      // 更新後の状態に応じてリストから除外するか更新するか
      const updatedTask = data ? data[0] : null;
      if (updatedTask) {
        if (updatedTask.status === 'completed') {
           // 完了にした場合はリストから消す
           setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
           // 裏でクリーンアップ処理を実行（非同期で待たない）
           cleanUpOldCompletedTasks();
        } else {
           setTasks((prevTasks) => prevTasks.map((task) => (task.id === id ? updatedTask : task)));
        }
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
      let key = '今日のタスク';
      if (task.status === 'rescheduled' && task.rescheduled_to) {
        key = task.rescheduled_to;
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
      return new Date(a).getTime() - new Date(b).getTime();
    });
  }, [groupedTasks]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Link to="/history" className="history-link">
          完了済みのタスクを見る →
        </Link>
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
        {sortedGroupKeys.length === 0 && <p style={{textAlign: 'center', color: '#888'}}>タスクはありません</p>}
        {sortedGroupKeys.map(groupKey => (
          <div className="task-section" key={groupKey}>
            <h2>{groupKey}</h2>
            <ul className="task-list">
              {groupedTasks[groupKey].map((task) => (
                <li key={task.id}>
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
                      <div className="task-actions">
                        <button onClick={() => handleComplete(task.id)} className="complete-btn">完了</button>
                        <button onClick={() => handleRescheduleClick(task.id)} className="reschedule-btn">延期</button>
                      </div>
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
