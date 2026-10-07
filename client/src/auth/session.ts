const AUTH_EVENT_KEY = 'prem_auth_event';

let sessionGeneration = 0;
let logoutInProgress = false;

export const getSessionGeneration = () => sessionGeneration;
export const isLogoutInProgress = () => logoutInProgress;

export const beginLogout = () => {
  logoutInProgress = true;
  sessionGeneration += 1;
};

export const markSessionStarted = () => {
  logoutInProgress = false;
  sessionGeneration += 1;
};

export const clearLocalAuthState = () => {
  localStorage.removeItem('prem_token');
  localStorage.removeItem('prem_user');
  localStorage.removeItem('prem_cart_merge_token');
  sessionStorage.removeItem('pending_business_gstin');
};

export const broadcastLogout = () => {
  const payload = JSON.stringify({ type: 'logout', at: Date.now() });
  localStorage.setItem(AUTH_EVENT_KEY, payload);
  localStorage.removeItem(AUTH_EVENT_KEY);
  window.dispatchEvent(new CustomEvent('prem:logout'));
};

export const subscribeToLogout = (listener: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === AUTH_EVENT_KEY && event.newValue) listener();
  };
  const onLocal = () => listener();
  window.addEventListener('storage', onStorage);
  window.addEventListener('prem:logout', onLocal);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('prem:logout', onLocal);
  };
};
