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
    console.log(`Admin requesting messages for session: ${sessionId}`);
    try {
      const messages = await getMessages(sessionId);
      console.log(`Found ${messages.length} messages for session ${sessionId}`);
      
      // Format messages for frontend
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        message: msg.content,
        isAdmin: msg.sender === 'admin',
        timestamp: msg.timestamp
      }));
      
      socket.emit("messages-history", formattedMessages);
    } catch (error) {
      console.error("Error getting messages:", error);
      socket.emit("messages-history", []);
    }
  });

  socket.on("init_session", async ({ sessionId }, callback) => {
    console.log("Initializing session:", sessionId);
    
    if (!sessionId) {
      sessionId = await createChatSession(
        socket.handshake.address,
        socket.handshake.headers["user-agent"]
      );
      console.log("Created new session:", sessionId);
    } else {
      console.log("Using existing session:", sessionId);
      
      // Ensure session exists in database (create if not)
      try {
        const { getSession } = await import("../services/chatService.js");
        const existingSession = await getSession(sessionId);
        if (!existingSession) {
          console.log("Session not found in database, creating it");
          await createChatSession('unknown', 'unknown');
        }
      } catch (error) {
        console.log("Session verification failed, will be created when first message is sent");
      }
    }

    // Join the socket to the session room
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined room ${sessionId}`);
    
    // Track active session
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, {
        sessionId,
        user: `User-${sessionId.substring(0, 8)}`,
        lastMessage: "Session started",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isActive: true
      });
      
      console.log("Added new session to active sessions");
      
      // Notify admins about new session
      adminSockets.forEach(adminId => {
        const adminSocket = io.sockets.sockets.get(adminId);
        if (adminSocket) {
          adminSocket.emit("sessions-list", Array.from(activeSessions.values()));
        }
      });
    } else {
      // Mark existing session as active
      const session = activeSessions.get(sessionId);
      session.isActive = true;
      console.log("Marked existing session as active");
    }
    
    callback({ sessionId });
  });

  socket.on("user_message", async ({ sessionId, content }) => {
    console.log(`User message from session ${sessionId}: ${content}`);
    
    try {
      const msg = await saveMessage(sessionId, "user", content);
      console.log("Saved message:", msg);
      
      // Format message for frontend
      const formattedMessage = {
        sender: msg.sender,
        content: msg.content,
        createdAt: msg.createdAt.toISOString()
      };
      
      console.log("Sending formatted message:", formattedMessage);
      // Don't echo back to sender, only send to other room members (like admins)
      socket.to(sessionId).emit("message", formattedMessage);
      
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
    } catch (error) {
      console.error("Error handling user message:", error);
    }
  });

  socket.on("admin_message", async ({ sessionId, content }) => {
    console.log(`Admin sending message to session ${sessionId}: ${content}`);
    
    try {
      const msg = await saveMessage(sessionId, "admin", content);
      console.log("Saved admin message:", msg);
      
      // Format message for frontend
      const formattedMessage = {
        sender: msg.sender,
        content: msg.content,
        createdAt: msg.createdAt.toISOString()
      };
      
      console.log("Sending formatted admin message:", formattedMessage);
      // Send message to user in that session
      io.to(sessionId).emit("message", formattedMessage);
      console.log(`Admin message sent to room ${sessionId}`);
      
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
    if (adminSockets.has(socket.id)) {
      adminSockets.delete(socket.id);
      console.log("Admin disconnected:", socket.id);
    }
    
    // Mark user sessions as inactive if they disconnect
    // Find sessions that this socket was part of
    for (const [sessionId, session] of activeSessions.entries()) {
      // Mark session as inactive (but keep it in memory for a while)
      if (session.isActive) {
        session.isActive = false;
        session.lastMessage = session.lastMessage || "User disconnected";
        session.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Notify admins about session status change
        adminSockets.forEach(adminId => {
          const adminSocket = io.sockets.sockets.get(adminId);
          if (adminSocket) {
            adminSocket.emit("sessions-list", Array.from(activeSessions.values()));
          }
        });
      }
    }
  });
}
