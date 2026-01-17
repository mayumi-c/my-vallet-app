import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'login' | 'reset_request'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('登録確認メールを送信しました。メールを確認してください。');
    }
    setLoading(false);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    // Redirect back to the root of the app. 
    // Supabase Settings > Authentication > URL Configuration must include this URL.
    const redirectTo = window.location.origin; 
    console.log('Reset password redirect URL:', redirectTo);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('パスワードリセットのメールを送信しました。');
    }
    setLoading(false);
  };

  if (mode === 'reset_request') {
    return (
      <div className="auth-container">
        <h1>パスワード再設定</h1>
        <p>登録したメールアドレスを入力してください。</p>
        <div className="auth-form">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="auth-buttons">
            <button onClick={handleResetRequest} disabled={loading}>
              {loading ? '送信中...' : 'メールを送信'}
            </button>
            <button onClick={() => { setMode('login'); setMessage(''); }} disabled={loading}>
              キャンセル
            </button>
          </div>
          {message && <p className="auth-message">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h1>My Bullet Journal</h1>
      <p>ログインまたは新規登録してください</p>
      <div className="auth-form">
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="password-requirement">
          新規登録の際は、ご希望のパスワードを入力してください。<br />
          (6文字以上の英数字を推奨します)
        </p>
        <div className="auth-buttons">
          <button onClick={handleLogin} disabled={loading}>
            {loading ? '処理中...' : 'ログイン'}
          </button>
          <button onClick={handleSignUp} disabled={loading}>
            {loading ? '処理中...' : '新規登録'}
          </button>
        </div>
        
        <div style={{ marginTop: '1rem' }}>
          <button 
            className="text-link" 
            onClick={() => { setMode('reset_request'); setMessage(''); }}
            style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
          >
            パスワードを忘れた場合
          </button>
        </div>

        {message && <p className="auth-message">{message}</p>}
      </div>
    </div>
  );
}