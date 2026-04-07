import React, { useState } from 'react';
import { Search, MoreVertical, MessageSquare, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useEffect } from 'react';

const Sidebar = ({ conversations, onSelect, activeId, refreshConversations }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { user, logout } = useAuth();
  const socket = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('refresh_conversations', () => {
        refreshConversations();
      });
      return () => socket.off('refresh_conversations');
    }
  }, [socket]);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setIsSearching(true);
      try {
        const res = await axios.get(`http://localhost:5001/api/users/search?query=${query}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error('Search error:', err);
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const startConversation = async (participantId) => {
    try {
      const res = await axios.post('http://localhost:5001/api/conversations', { participantId });
      await refreshConversations();
      setSearchQuery('');
      setIsSearching(false);
      onSelect({ id: res.data.id }); 
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  return (
    <div className="sidebar">
      {/* Header */}
      <div style={{ backgroundColor: '#f0f2f5', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e9edef' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
           <div style={{ width: '40px', height: '40px', backgroundColor: '#008069', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              {user.username.charAt(0).toUpperCase()}
           </div>
           <span style={{ fontWeight: '500' }}>{user.username}</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', color: '#54656f' }}>
          <MessageSquare size={22} cursor="pointer" title="New Chat" onClick={() => document.getElementById('sidebar-search').focus()} />
          <div title="Logout" onClick={logout} style={{ cursor: 'pointer' }}>
            <MoreVertical size={22} />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #e9edef' }}>
        <div style={{ backgroundColor: '#f0f2f5', borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '4px 12px' }}>
          <Search size={18} color="#54656f" />
          <input 
            id="sidebar-search"
            type="text" 
            placeholder="Search for username to add" 
            value={searchQuery}
            onChange={handleSearch}
            style={{ border: 'none', backgroundColor: 'transparent', padding: '8px', width: '100%', outline: 'none' }}
          />
          {searchQuery && (
            <span onClick={() => {setSearchQuery(''); setIsSearching(false);}} style={{ cursor: 'pointer', color: '#54656f', fontSize: '1.2rem' }}>×</span>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isSearching ? (
          <div>
            <div style={{ padding: '15px 16px', color: '#008069', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Search Results</div>
            {searchResults.length === 0 ? (
              <div style={{ padding: '10px 16px', color: '#667781', fontSize: '0.9rem' }}>No users found with that username</div>
            ) : (
              searchResults.map(result => (
                <div 
                  key={result.id} 
                  onClick={() => startConversation(result.id)}
                  style={{ display: 'flex', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f5f6f6', alignItems: 'center', gap: '15px' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f6f6'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ width: '45px', height: '45px', backgroundColor: '#e9edef', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#54656f' }}>
                    <User size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{result.username}</div>
                    <div style={{ fontSize: '0.85rem', color: '#25d366' }}>Click to start chat</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          conversations.map(conv => {
            const otherUser = conv.other_users?.[0] || { username: 'Group Chat' };
            return (
              <div 
                key={conv.id} 
                onClick={() => onSelect(conv)}
                style={{ 
                  display: 'flex', 
                  padding: '12px 16px', 
                  cursor: 'pointer', 
                  borderBottom: '1px solid #f5f6f6', 
                  alignItems: 'center', 
                  gap: '15px',
                  backgroundColor: activeId === conv.id ? '#ebebeb' : 'transparent'
                }}
              >
                <div style={{ width: '45px', height: '45px', backgroundColor: '#e9edef', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#54656f' }}>
                  <User size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: '500' }}>{otherUser.username}</div>
                    <div style={{ fontSize: '0.75rem', color: '#667781' }}>
                      {conv.last_message_time ? new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                    <div style={{ fontSize: '0.85rem', color: '#667781', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                      {conv.last_message || 'Start a new conversation'}
                    </div>
                    {conv.unread_count > 0 && (
                      <div style={{ 
                        backgroundColor: '#25d366', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: '20px', 
                        height: '20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold' 
                      }}>
                        {conv.unread_count}
                      </div>
                    )}
                </div>
              </div>
            )
          })
        )}
        {conversations.length === 0 && !isSearching && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#667781' }}>
            <p>You don't have any chats yet.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '5px' }}>Search for a username above to "add" someone and start chatting!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
