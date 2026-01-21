import React from 'react';

interface SettingsProps {
  setTheme: (theme: string) => void;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ setTheme, onClose }) => {
  const themes = [
    { name: 'デフォルト', id: '' },
    { name: 'ダークブルー', id: 'theme-dark-blue' },
    { name: 'パステル', id: 'theme-pastel' },
  ];

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>テーマ設定</h3>
        <button onClick={onClose} className="close-btn">&times;</button>
      </div>
      <div className="theme-options">
        {themes.map(theme => (
          <button key={theme.id} onClick={() => setTheme(theme.id)}>
            {theme.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Settings;
