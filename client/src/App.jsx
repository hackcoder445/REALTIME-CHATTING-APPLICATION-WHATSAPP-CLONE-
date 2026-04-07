import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './components/Login';
import Register from './components/Register';
import ChatContainer from './components/ChatContainer';
import { useState } from 'react';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  if (loading) {
    return <div className="auth-container">Loading...</div>;
  }

  if (!user) {
    return isRegistering ? (
      <Register onSwitch={() => setIsRegistering(false)} />
    ) : (
      <Login onSwitch={() => setIsRegistering(true)} />
    );
  }

  return (
    <SocketProvider>
      <ChatContainer />
    </SocketProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
