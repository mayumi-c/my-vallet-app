import { useState } from 'react';
import { supabase } from './supabaseClient';

interface PasswordResetProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export default function PasswordReset({ onCancel, onSuccess }: PasswordResetProps) {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      setMessage('パスワードを更新しました。');
      setLoading(false);
      // 少し待ってから完了処理へ
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }
  };

  return (
    <div className="auth-container">
      <h1>新しいパスワード設定</h1>
      <p>新しいパスワードを入力してください。</p>
      <div className="auth-form">
        <input
          type="password"
          placeholder="新しいパスワード"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <p className="password-requirement">
          (6文字以上の英数字を推奨します)
        </p>
        <div className="auth-buttons">
          <button onClick={handleResetConfirm} disabled={loading}>
            {loading ? '更新中...' : 'パスワード変更'}
          </button>
          <button onClick={onCancel} disabled={loading} style={{ backgroundColor: '#ccc' }}>
            キャンセル
          </button>
        </div>
        {message && <p className="auth-message">{message}</p>}
      </div>
    </div>
  );
}
