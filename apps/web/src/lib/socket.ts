import { io, type Socket } from 'socket.io-client';

/**
 * Socket 单例（docs/05 §6）：namespace /ws，websocket 传输，登录后懒连接。
 * token 变化（重新登录）由调用方断开重连；登出由 http 401 桥接调用 closeSocket。
 */
let socket: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token: string): Socket {
  if (socket && currentToken === token) return socket;
  socket?.disconnect();
  currentToken = token;
  socket = io('/ws', {
    auth: { token },
    transports: ['websocket'],
    reconnectionDelayMax: 10_000,
  });
  return socket;
}

export function closeSocket(): void {
  socket?.disconnect();
  socket = null;
  currentToken = null;
}
