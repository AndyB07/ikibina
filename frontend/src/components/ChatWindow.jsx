import React, { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw } from 'lucide-react';

export default function ChatWindow({ token, user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch('http://localhost:5000/api/chat', { headers });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching chat:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: newMessage })
      });
      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    
    // Poll messages every 4 seconds
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [token]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '500px', overflow: 'hidden' }}>
      
      {/* Chat header */}
      <div className="flex-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-secondary)' }}>
        <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
          Group Discussion Board
        </span>
        <button onClick={fetchMessages} className="btn btn-secondary btn-icon" style={{ padding: '6px' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Messages stream */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map(msg => {
          const isOwnMessage = msg.sender_name === user.name;
          return (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              alignSelf: isOwnMessage ? 'flex-end' : 'flex-start'
            }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{msg.sender_name}</span>
                <span className={`badge badge-${msg.sender_role}`} style={{ fontSize: '8px', padding: '2px 6px' }}>
                  {msg.sender_role}
                </span>
              </span>
              <div style={{
                background: isOwnMessage ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' : 'var(--bg-tertiary)',
                color: '#ffffff',
                padding: '10px 14px',
                borderRadius: isOwnMessage ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                fontSize: 'var(--font-size-sm)',
                lineHeight: '1.4',
                border: isOwnMessage ? 'none' : '1px solid var(--border-glass)'
              }}>
                {msg.message}
              </div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Send message form */}
      <form onSubmit={handleSendMessage} style={{ padding: '14px 20px', borderTop: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Write message here..."
          className="input-field"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ flex: 1, padding: '10px 14px' }}
        />
        <button type="submit" className="btn btn-primary btn-icon" style={{ borderRadius: '10px', width: '42px', height: '42px' }}>
          <Send size={16} />
        </button>
      </form>

    </div>
  );
}
