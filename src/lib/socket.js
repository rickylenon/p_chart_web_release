import { getIO } from '../pages/api/socket';

/**
 * Emit an event to all connected clients
 * @param {string} event - Event name
 * @param {any} data - Data to send
 */
export const emitToAll = (event, data) => {
  try {
    const io = getIO();
    console.log(`Emitting ${event} to all clients:`, data);
    io.emit(event, data);
  } catch (error) {
    console.error('Failed to emit socket event:', error);
  }
};

/**
 * Emit an event to a specific client
 * @param {string} socketId - Socket ID of client
 * @param {string} event - Event name
 * @param {any} data - Data to send
 */
export const emitToClient = (socketId, event, data) => {
  try {
    const io = getIO();
    console.log(`Emitting ${event} to client ${socketId}:`, data);
    io.to(socketId).emit(event, data);
  } catch (error) {
    console.error('Failed to emit socket event to client:', error);
  }
};

/**
 * Emit an event to a specific room
 * @param {string} room - Room name
 * @param {string} event - Event name
 * @param {any} data - Data to send
 */
export const emitToRoom = (room, event, data) => {
  try {
    const io = getIO();
    console.log(`Emitting ${event} to room ${room}:`, data);
    io.to(room).emit(event, data);
  } catch (error) {
    console.error('Failed to emit socket event to room:', error);
  }
}; 