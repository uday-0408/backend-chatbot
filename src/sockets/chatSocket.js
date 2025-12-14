import { createChatSession, saveMessage, getMessages } from "../services/chatService.js";

// Store admin sockets for broadcasting
let adminSockets = new Set();
let activeSessions = new Map();

export function chatSocket(io, socket) {
  console.log("Client connected:", socket.id);

  // Handle admin connection
  socket.on("admin-connect", () => {
    console.log("Admin connected:", socket.id);
    adminSockets.add(socket.id);
    
    // Send current sessions to admin
    const sessionsList = Array.from(activeSessions.values());
    socket.emit("sessions-list", sessionsList);
  });

  // Handle getting sessions for admin
  socket.on("get-sessions", () => {
    const sessionsList = Array.from(activeSessions.values());
    socket.emit("sessions-list", sessionsList);
  });

  // Handle getting messages for a specific session
  socket.on("get-messages", async ({ sessionId }) => {
    try {
      const messages = await getMessages(sessionId);
      socket.emit("messages-history", messages);
    } catch (error) {
      console.error("Error getting messages:", error);
      socket.emit("messages-history", []);
    }
  });

  socket.on("init_session", async ({ sessionId }, callback) => {
    if (!sessionId) {
      sessionId = await createChatSession(
        socket.handshake.address,
        socket.handshake.headers["user-agent"]
      );
    }

    socket.join(sessionId);
    
    // Track active session
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, {
        sessionId,
        user: `User-${sessionId.substring(0, 8)}`,
        lastMessage: "Session started",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isActive: true
      });
      
      // Notify admins about new session
      adminSockets.forEach(adminId => {
        const adminSocket = io.sockets.sockets.get(adminId);
        if (adminSocket) {
          adminSocket.emit("sessions-list", Array.from(activeSessions.values()));
        }
      });
    }
    
    callback({ sessionId });
  });

  socket.on("user_message", async ({ sessionId, content }) => {
    console.log(`User message from session ${sessionId}: ${content}`);
    
    const msg = await saveMessage(sessionId, "user", content);
    io.to(sessionId).emit("message", msg);
    
    // Update session info and notify admins
    if (activeSessions.has(sessionId)) {
      const session = activeSessions.get(sessionId);
      session.lastMessage = content.substring(0, 50) + (content.length > 50 ? "..." : "");
      session.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Notify admins about message
      adminSockets.forEach(adminId => {
        const adminSocket = io.sockets.sockets.get(adminId);
        if (adminSocket) {
          adminSocket.emit("sessions-list", Array.from(activeSessions.values()));
          adminSocket.emit("new-message", { sessionId, message: content });
        }
      });
    }
  });

  socket.on("admin_message", async ({ sessionId, content }) => {
    console.log(`Admin sending message to session ${sessionId}: ${content}`);
    
    try {
      const msg = await saveMessage(sessionId, "admin", content);
      console.log("Saved message:", msg);
      
      // Send message to user in that session
      io.to(sessionId).emit("message", msg);
      console.log(`Message sent to room ${sessionId}`);
      
      // Update session info
      if (activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId);
        session.lastMessage = `Admin: ${content.substring(0, 40)}${content.length > 40 ? "..." : ""}`;
        session.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Notify all admins about updated sessions
        adminSockets.forEach(adminId => {
          const adminSocket = io.sockets.sockets.get(adminId);
          if (adminSocket) {
            adminSocket.emit("sessions-list", Array.from(activeSessions.values()));
          }
        });
      }
    } catch (error) {
      console.error("Error handling admin message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    
    // Remove from admin sockets if it was an admin
    adminSockets.delete(socket.id);
  });
}
