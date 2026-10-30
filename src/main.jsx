import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './rooms/typewriter.css';
import './rooms/cassette.css';
import './rooms/polaroid.css';

createRoot(document.getElementById('root')).render(<App />);
