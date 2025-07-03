import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import FileCompressionApp from './components/FileCompressionApp';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <FileCompressionApp />
  </React.StrictMode>
);