import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { format } from 'date-fns';

export default function Chat() {
  const { user, api }  = useAuth();
  const { socket, joinRoom, sendMessage, onMessage, onTyping, onStopTyping, emitTyping, stopTyping, isOnline } = useSocket();

  const [contacts,  setContacts]  = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [isTyping,  setIsTyping]  = useState(false);
  const messagesEnd = useRef(null);
  const typingTimer = useRef(null);
  const activeRoom  = useRef(null);

  // Load contacts based on role
  useEffect(() => {
    const endpoint = user.role === 'patient' ? '/doctors' : '/patients';
    api.get(endpoint).then(r => setContacts(r.data)).catch(() => {});
  // eslint-disable-next-line
  }, []);

  // Join room and listen for messages when contact changes
  useEffect(() => {
    if (!activeContact || !socket) return;
    const ids = [user._id, activeContact._id].sort();
    const roomId = `chat_${ids[0]}_${ids[1]}`;
    activeRoom.current = roomId;

    joinRoom(roomId);

    // Load message history from localStorage (demo) or API
    const stored = localStorage.getItem(`vb_chat_${roomId}`);
    setMessages(stored ? JSON.parse(stored) : []);

    const unsubMsg  = onMessage(msg => {
      setMessages(prev => {
        const updated = [...prev, msg];
        localStorage.setItem(`vb_chat_${roomId}`, JSON.stringify(updated));
        return updated;
      });
    });
    const unsubTyp  = onTyping(({ senderName }) => setIsTyping(senderName));
    const unsubStop = onStopTyping(() => setIsTyping(false));

    return () => { unsubMsg(); unsubTyp(); unsubStop(); };
  // eslint-disable-next-line
  }, [activeContact, socket]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInput = (e) => {
    setInput(e.target.value);
    if (!activeRoom.current) return;
    emitTyping({ roomId: activeRoom.current, senderName: user.name });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      stopTyping({ roomId: activeRoom.current });
    }, 1500);
  };

  const handleSend = () => {
    if (!input.trim() || !activeContact) return;
    const msg = {
      roomId:     activeRoom.current,
      message:    input.trim(),
      senderId:   user._id,
      senderName: user.name,
      senderRole: user.role,
      timestamp:  new Date(),
    };
    sendMessage(msg);
    // Add to own messages immediately
    setMessages(prev => {
      const updated = [...prev, { ...msg, isSelf: true }];
      localStorage.setItem(`vb_chat_${activeRoom.current}`, JSON.stringify(updated));
      return updated;
    });
    setInput('');
    stopTyping({ roomId: activeRoom.current });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const contactName = (c) => user.role === 'patient' ? `Dr. ${c.name}` : c.name;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div><h1>Messages</h1><p>Real-time secure messaging</p></div>
      </div>

      <div className="card" style={{ padding: 0, height: 'calc(100vh - 200px)', display: 'flex', overflow: 'hidden' }}>
        {/* Contact List */}
        <div className="chat-list">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {user.role === 'patient' ? 'Your Doctors' : 'Your Patients'}
          </div>
          {contacts.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No contacts yet
            </div>
          ) : contacts.map(c => (
            <div
              key={c._id}
              className={`chat-list-item ${activeContact?._id === c._id ? 'active' : ''}`}
              onClick={() => setActiveContact(c)}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div className="avatar sm">{c.name[0]}</div>
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 8, height: 8, borderRadius: '50%',
                  background: isOnline(c._id) ? 'var(--success)' : 'var(--muted)',
                  border: '1.5px solid var(--surface)',
                }}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contactName(c)}
                </div>
                <div style={{ fontSize: 11, color: isOnline(c._id) ? 'var(--success)' : 'var(--muted)' }}>
                  {isOnline(c._id) ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat Window */}
        <div className="chat-messages">
          {!activeContact ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--muted)' }}>
              <div style={{ fontSize: 48 }}>💬</div>
              <div style={{ fontSize: 15 }}>Select a contact to start messaging</div>
              <div style={{ fontSize: 13 }}>All conversations are end-to-end secure</div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <div className="avatar">{activeContact.name[0]}</div>
                  <div style={{
                    position: 'absolute', bottom: 1, right: 1,
                    width: 9, height: 9, borderRadius: '50%',
                    background: isOnline(activeContact._id) ? 'var(--success)' : 'var(--muted)',
                    border: '2px solid var(--surface)',
                  }}/>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{contactName(activeContact)}</div>
                  <div style={{ fontSize: 11, color: isOnline(activeContact._id) ? 'var(--success)' : 'var(--muted)' }}>
                    {isOnline(activeContact._id) ? '● Online' : '○ Offline'}
                    {activeContact.specialization && ` • ${activeContact.specialization}`}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="messages-area">
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 40 }}>
                    No messages yet. Say hello! 👋
                  </div>
                ) : messages.map((m, i) => {
                  const isSelf = m.senderId === user._id || m.isSelf;
                  return (
                    <div key={i} style={{ alignSelf: isSelf ? 'flex-end' : 'flex-start', maxWidth: '68%' }}>
                      {!isSelf && <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3, paddingLeft: 4 }}>{m.senderName}</div>}
                      <div className={`msg-bubble ${isSelf ? 'sent' : 'recv'}`}>
                        {m.message}
                        <div className="msg-time">
                          {m.timestamp ? format(new Date(m.timestamp), 'h:mm a') : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isTyping && (
                  <div style={{ alignSelf: 'flex-start' }}>
                    <div className="msg-bubble recv" style={{ padding: '8px 14px' }}>
                      <span style={{ letterSpacing: 2, fontSize: 16 }}>···</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginLeft: 6 }}>{isTyping} is typing</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEnd} />
              </div>

              {/* Input */}
              <div className="chat-input-row">
                <textarea
                  rows={1}
                  placeholder={`Message ${contactName(activeContact)}...`}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  style={{ flexShrink: 0, width: 40, height: 40, padding: 0, borderRadius: '50%', fontSize: 18 }}
                >
                  ➤
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
