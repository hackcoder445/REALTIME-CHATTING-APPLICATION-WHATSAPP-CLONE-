import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';

const ChatContainer = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const fetchConversations = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/conversations');
      setConversations(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (message) => {
        // Update conversation list with last message
        setConversations(prev => {
          return prev.map(conv => {
            if (conv.id === message.conversation_id) {
              return { ...conv, last_message: message.content, last_message_time: message.created_at };
            }
            return conv;
          });
        });
      });

      return () => socket.off('receive_message');
    }
  }, [socket]);

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    if (socket) {
      socket.emit('join_conversation', conv.id);
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        conversations={conversations} 
        onSelect={handleSelectConversation} 
        activeId={activeConversation?.id}
        refreshConversations={fetchConversations}
      />
      {activeConversation ? (
        <ChatWindow conversation={activeConversation} />
      ) : (
        <div className="chat-window" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--wa-text-secondary)' }}>
          <div style={{ textAlign: 'center' }}>
            <h2>WhatsApp Web</h2>
            <p>Send and receive messages without keeping your phone online.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
