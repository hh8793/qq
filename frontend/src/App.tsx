import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import Settlements from './pages/Settlements';
import Subscriptions from './pages/Subscriptions';
import Services from './pages/Services';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/settlements" element={<Settlements />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/services" element={<Services />} />
      </Routes>
    </Layout>
  );
}

export default App;
