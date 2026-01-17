import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Link } from 'react-router-dom';

interface Task {
  id: number;
  text: string;
  status: 'completed';
  created_at: string;
}

interface CompletedHistoryProps {
  session: any;
}

export default function CompletedHistory({ session }: CompletedHistoryProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompletedTasks = async () => {
      if (!session?.user) return;
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false }); // 新しい順

        if (error) throw error;
        setTasks(data as Task[]);
      } catch (error) {
        console.error('Error fetching completed tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedTasks();
  }, [session]);

  // 元に戻す機能（オプション）
  const handleUndo = async (id: number) => {
    try {
        const { error } = await supabase
            .from('tasks')
            .update({ status: 'pending' })
            .eq('id', id);
        
        if (error) throw error;
        // リストから除外
        setTasks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
        console.error('Undo failed:', error);
        alert('元に戻せませんでした');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/" className="back-link">
          ← タスク一覧に戻る
        </Link>
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>完了したタスク (最新50件)</h2>

      {loading ? (
        <p style={{ textAlign: 'center' }}>読み込み中...</p>
      ) : (
        <div className="task-section">
            <ul className="task-list">
            {tasks.length === 0 && <li style={{ justifyContent: 'center' }}>完了したタスクはありません</li>}
            {tasks.map((task) => (
                <li key={task.id} className="completed">
                    <span>{task.text}</span>
                    <div className="task-actions">
                        <span style={{ fontSize: '0.8rem', color: '#999', marginRight: '1rem' }}>
                            {new Date(task.created_at).toLocaleDateString()}
                        </span>
                        <button onClick={() => handleUndo(task.id)} className="undo-btn" style={{ borderColor: '#aaa', color: '#aaa' }}>
                           戻す
                        </button>
                    </div>
                </li>
            ))}
            </ul>
        </div>
      )}
    </div>
  );
}
