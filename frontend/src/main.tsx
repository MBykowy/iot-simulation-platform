import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { WebSocketProvider } from './contexts/WebSocketProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <WebSocketProvider>
                <App />
            </WebSocketProvider>
        </BrowserRouter>
    </StrictMode>,
);