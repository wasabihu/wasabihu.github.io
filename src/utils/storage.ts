export const clearLocalStorage = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('清除本地存储失败:', error);
    return false;
  }
};
