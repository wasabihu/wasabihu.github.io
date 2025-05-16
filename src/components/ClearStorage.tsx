import React from 'react';
import { clearLocalStorage } from '../utils/storage';

export const ClearStorage: React.FC = () => {
  const handleClear = () => {
    const success = clearLocalStorage();
    if (success) {
      alert('本地存储已清除');
    } else {
      alert('清除本地存储失败');
    }
  };

  return (
    <button onClick={handleClear} className="btn btn-danger">
      清除本地存储
    </button>
  );
};
