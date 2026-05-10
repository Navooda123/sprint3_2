import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const Chat = ({ recipientId, recipientName }) => {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    
    if (socket) {
      socket.on('new_message', (msg) => {
        if (msg.senderId === user.id) return; // Prevent duplicate for sender
        
        if (msg.senderId === recipientId || msg.recipientId === recipientId) {
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      });
    }

    return () => {
      if (socket) socket.off('new_message');
    };
  }, [recipientId, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/messages/${recipientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ recipientId, text: newMessage })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data]);
        setNewMessage('');
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="card flex flex-col" style={{ height: '500px', padding: 0, overflow: 'hidden' }}>
      <div className="card-header flex items-center justify-between" style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--primary)', color: 'white' }}>
        <h3 style={{ margin: 0 }}>Chat with {recipientName}</h3>
      </div>
      
      <div className="flex-1" style={{ overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            style={{ 
              alignSelf: msg.senderId === user.id ? 'flex-end' : 'flex-start',
              backgroundColor: msg.senderId === user.id ? 'var(--primary)' : 'var(--bg-color)',
              color: msg.senderId === user.id ? 'white' : 'var(--text-main)',
              padding: '10px 15px',
              borderRadius: '15px',
              maxWidth: '80%',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {recipientId === 0 && msg.senderId !== user.id && (
              <div style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8, marginBottom: '2px' }}>
                {msg.senderName}
              </div>
            )}
            <div>{msg.text}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '2px', textAlign: 'right' }}>
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{ padding: '15px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="Type a message..." 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary">Send</button>
      </form>
    </div>
  );
};

export default Chat;
