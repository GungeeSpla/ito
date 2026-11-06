import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import Layout from './components/Layout';
import { navigate, usePath } from './lib/router.ts';
import Home from './pages/Home';
import Room from './pages/Room';
import './index.css';

function App() {
  const path = usePath();
  const roomId = path.match(/^\/room\/([^/]+)\/?$/)?.[1];
  const known = path === '/' || roomId !== undefined;
  // 知らない URL はトップへ
  useEffect(() => {
    if (!known) navigate('/', { replace: true });
  }, [known]);
  return <Layout>{roomId !== undefined ? <Room roomId={decodeURIComponent(roomId)} /> : <Home />}</Layout>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
