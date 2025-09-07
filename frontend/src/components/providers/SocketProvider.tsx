'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthProvider';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token && user) {
      // Initialize socket connection
      const newSocket = io(SOCKET_URL, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        
        // Join user's personal room
        newSocket.emit('join-room', user._id);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Real-time event handlers
      newSocket.on('new-affirmation', (data) => {
        console.log('New affirmation received:', data);
        // Handle new affirmation notification
        showNotification('New affirmation shared!', data.content);
      });

      newSocket.on('challenge-progress', (data) => {
        console.log('Challenge progress update:', data);
        // Handle challenge progress update
        showNotification('Challenge Update', `Progress updated for ${data.challengeTitle}`);
      });

      newSocket.on('friend-request', (data) => {
        console.log('Friend request received:', data);
        // Handle friend request notification
        showNotification('Friend Request', `${data.from.username} sent you a friend request`);
      });

      newSocket.on('activity-like', (data) => {
        console.log('Activity liked:', data);
        // Handle activity like notification
        showNotification('Activity Liked', `${data.user.username} liked your activity`);
      });

      newSocket.on('group-invitation', (data) => {
        console.log('Group invitation received:', data);
        // Handle group invitation notification
        showNotification('Group Invitation', `You've been invited to join ${data.groupName}`);
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // Clean up socket if user is not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, token, user]);

  const joinRoom = (roomId: string) => {
    if (socket && isConnected) {
      socket.emit('join-room', roomId);
    }
  };

  const leaveRoom = (roomId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-room', roomId);
    }
  };

  const emit = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  const on = (event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event: string, callback?: (data: any) => void) => {
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

// Utility function to show notifications
function showNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      }
    });
  }
}

// Hook for managing real-time notifications
export function useNotifications() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sendNotification = (recipientId: string, type: string, data: any) => {
    if (socket && isConnected) {
      socket.emit('send-notification', {
        recipientId,
        type,
        data,
      });
    }
  };

  return {
    sendNotification,
    isConnected,
  };
}