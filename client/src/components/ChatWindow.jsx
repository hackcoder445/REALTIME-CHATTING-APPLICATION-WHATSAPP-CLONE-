import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Paperclip, MoreVertical, Search } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import EmojiPicker from 'emoji-picker-react';

const ChatWindow = ({ conversation }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { user } = useAuth();
  const socket = useSocket();
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`http://localhost:5001/api/conversations/${conversation.id}/messages`);
      setMessages(res.data);
      await axios.post(`http://localhost:5001/api/conversations/${conversation.id}/read`);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (message) => {
        if (message.conversation_id === conversation.id) {
          setMessages(prev => [...prev, message]);
          axios.post(`http://localhost:5001/api/conversations/${conversation.id}/read`);
        }
      });

      socket.on('user_typing', (data) => {
        if (data.userId !== user.id && data.conversationId === conversation.id) {
          setIsTyping(true);
        }
      });

      socket.on('user_stop_typing', (data) => {
        if (data.userId !== user.id && data.conversationId === conversation.id) {
          setIsTyping(false);
        }
      });

      return () => {
        socket.off('receive_message');
        socket.off('user_typing');
        socket.off('user_stop_typing');
      };
    }
  }, [socket, conversation.id]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:5001/api/upload', formData);
      const { fileUrl, fileType } = res.data;
      
      const messageData = {
        conversationId: conversation.id,
        senderId: user.id,
        content: fileUrl,
        messageType: fileType.startsWith('image/') ? 'image' : 'file'
      };
      socket.emit('send_message', messageData);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 1000) return; // Prevent empty/tiny recordings

        const file = new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const res = await axios.post('http://localhost:5001/api/upload', formData);
          socket.emit('send_message', {
            conversationId: conversation.id,
            senderId: user.id,
            content: res.data.fileUrl,
            messageType: 'voice'
          });
        } catch (err) {
          console.error('Audio upload failed:', err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks in the stream
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socket.emit('send_message', {
      conversationId: conversation.id,
      senderId: user.id,
      content: newMessage,
      messageType: 'text'
    });
    setNewMessage('');
    socket.emit('stop_typing', { conversationId: conversation.id, userId: user.id });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (socket) {
      socket.emit('typing', { conversationId: conversation.id, userId: user.id, username: user.username });
      
      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        socket.emit('stop_typing', { conversationId: conversation.id, userId: user.id });
      }, 3000);
    }
  };

  const otherUser = conversation.other_users?.[0] || { username: 'Chat' };

  return (
    <div className="chat-window">
      {/* Header */}
      <div style={{ padding: '10px 16px', backgroundColor: '#f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e9edef', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#e9edef', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#54656f' }}>
             <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{otherUser.username.charAt(0).toUpperCase()}</div>
          </div>
          <div>
            <div style={{ fontWeight: '500' }}>{otherUser.username}</div>
            <div style={{ fontSize: '0.75rem', color: isTyping ? '#25d366' : '#667781', fontWeight: isTyping ? 'bold' : 'normal' }}>
              {isTyping ? 'typing...' : 'online'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', color: '#54656f' }}>
          <Search size={20} cursor="pointer" />
          <MoreVertical size={20} cursor="pointer" />
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 5%', display: 'flex', flexDirection: 'column', gap: '4px', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}>
        {messages.map((msg, index) => {
          const isOwn = msg.sender_id === user.id;
          return (
            <div key={msg.id || index} style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', backgroundColor: isOwn ? '#d9fdd3' : '#ffffff', padding: '6px 10px', borderRadius: '8px', maxWidth: '65%', boxShadow: '0 1px 1px rgba(0,0,0,0.1)', marginBottom: '4px', fontSize: '0.9rem' }}>
              {msg.message_type === 'image' ? (
                <img src={msg.content} alt="sent" style={{ maxWidth: '100%', borderRadius: '4px', cursor: 'pointer' }} onClick={() => window.open(msg.content)} />
              ) : msg.message_type === 'voice' ? (
                <audio src={msg.content} controls style={{ width: '220px', height: '40px' }} />
              ) : msg.message_type === 'file' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px' }}>
                  <Paperclip size={20} />
                  <a href={msg.content} target="_blank" rel="noreferrer" style={{ color: '#008069', textDecoration: 'none', fontWeight: '500' }}>Download Attachment</a>
                </div>
              ) : (
                msg.content
              )}
              <div style={{ fontSize: '0.65rem', color: '#667781', textAlign: 'right', marginTop: '4px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {isOwn && <span style={{ color: msg.is_read ? '#53bdeb' : '#667781' }}>{msg.is_read ? '✓✓' : '✓'}</span>}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '10px 16px', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
        {showEmojiPicker && (
          <div style={{ position: 'absolute', bottom: '65px', left: '16px', zIndex: 100 }}>
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
        <Smile size={24} color="#54656f" cursor="pointer" onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
        <label style={{ cursor: 'pointer' }}>
          <Paperclip size={24} color="#54656f" />
          <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
        </label>
        
        <div style={{ flex: 1, position: 'relative' }}>
          <form onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder={isRecording ? 'Recording voice message...' : 'Type a message'} 
              value={newMessage} 
              onChange={handleTyping} 
              disabled={isRecording}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none', outline: 'none', fontSize: '0.95rem' }} 
            />
          </form>
        </div>
        
        {newMessage.trim() ? (
          <Send size={24} color="#008069" cursor="pointer" onClick={handleSend} />
        ) : (
          <div 
            onMouseDown={startRecording} 
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            style={{ 
              cursor: 'pointer', 
              color: isRecording ? 'red' : '#54656f',
              backgroundColor: isRecording ? '#ffebee' : 'transparent',
              borderRadius: '50%',
              padding: '8px',
              transition: 'all 0.2s'
            }}
            title="Hold to record"
          >
            <div style={{ fontSize: '1.4rem' }}>{isRecording ? '⏹️' : '🎙️'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
