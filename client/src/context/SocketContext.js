// ─── SocketContext.js ─────────────────────────────────────────────────────────
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children, userId }) => {
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers]   = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  useEffect(() => {
    if (!userId) return;

    socketRef.current = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      socket.emit('register', userId);
    });

    socket.on('online_users',    (users) => setOnlineUsers(users));
    socket.on('emergency_broadcast', (data) => {
      setEmergencyAlert(data);
      setNotifications(n => [{ ...data, id: Date.now(), type: 'emergency' }, ...n]);
    });
    socket.on('new_appointment',      (data) => addNotif('appointment',  data));
    socket.on('appointment_status_changed', (data) => addNotif('appointment', data));
    socket.on('new_lab_report',       (data) => addNotif('lab_report',   data));
    socket.on('appointment_update',   () => {}); // handled per-page
    socket.on('lab_report_update',    () => {});
    socket.on('record_added',         () => {});

    return () => socket.disconnect();
  // eslint-disable-next-line
  }, [userId]);

  const addNotif = (type, data) => {
    setNotifications(n => [{ ...data, id: Date.now(), type }, ...n.slice(0, 19)]);
  };

  const clearEmergency = () => setEmergencyAlert(null);

  const value = {
    socket: socketRef.current,
    onlineUsers,
    notifications,
    emergencyAlert,
    clearEmergency,
    emitEmergency: (data) => socketRef.current?.emit('emergency_alert', data),
    joinRoom:    (roomId) => socketRef.current?.emit('join_room', roomId),
    sendMessage: (data)   => socketRef.current?.emit('send_message', data),
    emitTyping:  (data)   => socketRef.current?.emit('typing', data),
    stopTyping:  (data)   => socketRef.current?.emit('stop_typing', data),
    onMessage:   (cb) => { socketRef.current?.on('receive_message', cb); return () => socketRef.current?.off('receive_message', cb); },
    onTyping:    (cb) => { socketRef.current?.on('user_typing', cb);     return () => socketRef.current?.off('user_typing', cb); },
    onStopTyping:(cb) => { socketRef.current?.on('user_stop_typing', cb); return () => socketRef.current?.off('user_stop_typing', cb); },
    isOnline: (id) => onlineUsers.includes(id),
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
