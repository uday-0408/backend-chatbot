import { createChatSession, saveMessage, getMessages, getAllSessions } from "../services/chatService.js";
import { chatGPTService } from "../services/chatGPTService.js";

// Store admin sockets for broadcasting
let adminSockets = new Set();
let activeSessions = new Map();
let socketToSession = new Map(); // Track which socket belongs to which session
let aiEnabledSessions = new Map(); // Track which sessions have AI mode enabled
let lastUserMessages = new Map(); // Track last message per session to prevent duplicates
let processingRequests = new Map(); // Track ongoing AI requests to prevent duplicates

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

  // Handle getting all sessions (including past ones) from database
  socket.on("get-all-sessions", async () => {
    console.log("Admin requesting all sessions from database...");
    try {
      const allSessions = await getAllSessions();
      console.log(`Found ${allSessions.length} sessions in database`);
      const activeSessionIds = new Set(activeSessions.keys());
      console.log(`Found ${activeSessionIds.size} active sessions in memory`);
      
      // Mark active sessions and merge with database sessions
      const mergedSessions = allSessions.map(session => {
        if (activeSessionIds.has(session.sessionId)) {
          const activeSession = activeSessions.get(session.sessionId);
          return {
            ...session,
            isActive: true,
            lastMessage: activeSession.lastMessage || session.lastMessage,
            timestamp: activeSession.timestamp || session.timestamp
          };
        }
        return {
          ...session,
          timestamp: new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      });
      
      console.log(`Sending ${mergedSessions.length} merged sessions to admin`);
      socket.emit("all-sessions-list", mergedSessions);
    } catch (error) {
      console.error("Error getting all sessions:", error);
      socket.emit("all-sessions-list", []);
    }
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

  // Handle admin joining a specific session room to receive messages
  socket.on("admin-join-session", ({ sessionId }) => {
    console.log(`Admin ${socket.id} joining session room: ${sessionId}`);
    socket.join(sessionId);
    console.log(`Admin ${socket.id} successfully joined room ${sessionId}`);
  });

  // Handle admin toggle AI mode for a session
  socket.on("toggle-ai-mode", ({ sessionId, enabled }) => {
    console.log(`🤖 AI mode ${enabled ? 'enabled' : 'disabled'} for session: ${sessionId}`);
    
    if (enabled) {
      aiEnabledSessions.set(sessionId, true);
    } else {
      aiEnabledSessions.delete(sessionId);
    }
    
    // Notify all admins about the AI mode change
    adminSockets.forEach(adminId => {
      const adminSocket = io.sockets.sockets.get(adminId);
      if (adminSocket) {
        adminSocket.emit("ai-mode-changed", { sessionId, enabled });
      }
    });
  });

  // Handle admin leaving a specific session room
  socket.on("admin-leave-session", ({ sessionId }) => {
    console.log(`Admin ${socket.id} leaving session room: ${sessionId}`);
    socket.leave(sessionId);
    console.log(`Admin ${socket.id} left room ${sessionId}`);
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
    
    // Track socket-session relationship
    socketToSession.set(socket.id, sessionId);
    
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
    
    // Validate message content
    if (!content || content.trim().length === 0) {
      console.log('❌ Empty message, ignoring');
      return;
    }
    
    // Trim and limit message length
    const trimmedContent = content.trim();
    const maxLength = 500;
    const finalContent = trimmedContent.length > maxLength 
      ? trimmedContent.substring(0, maxLength) + '...' 
      : trimmedContent;
    
    // Check for duplicate messages to prevent spam
    const lastMessage = lastUserMessages.get(sessionId);
    if (lastMessage && lastMessage.content === finalContent && 
        Date.now() - lastMessage.timestamp < 5000) { // 5 second window
      console.log('❌ Duplicate message detected, ignoring');
      return;
    }
    
    // Create unique request key for deduplication
    const requestKey = `${sessionId}_${finalContent}`;
    
    // Check if this exact request is already being processed
    if (processingRequests.has(requestKey)) {
      console.log('❌ Request already being processed, ignoring duplicate');
      return;
    }
    
    // Mark this request as being processed
    processingRequests.set(requestKey, true);
    
    // Update last message tracker
    lastUserMessages.set(sessionId, {
      content: finalContent,
      timestamp: Date.now()
    });
    
    try {
      // Save user message first
      const userMsg = await saveMessage(sessionId, "user", finalContent);
      console.log("Saved user message:", userMsg);
      
      // Format user message for frontend
      const formattedUserMessage = {
        sender: userMsg.sender,
        content: userMsg.content,
        createdAt: userMsg.createdAt.toISOString()
      };
      
      // Send user message to admins viewing this session
      adminSockets.forEach(adminId => {
        const adminSocket = io.sockets.sockets.get(adminId);
        if (adminSocket && adminSocket.rooms.has(sessionId)) {
          adminSocket.emit("message", formattedUserMessage);
        }
      });
      
      // Check if AI mode is enabled for this session
      if (aiEnabledSessions.has(sessionId)) {
        console.log('\n🤖 AI MODE ACTIVE - GENERATING RESPONSE');
        console.log('🎯 Session ID:', sessionId);
        console.log('💬 User message:', content);
        
        try {
          // Get recent conversation history for context
          console.log('📚 Fetching conversation history...');
          const recentMessages = await getMessages(sessionId);
          console.log('📊 Total messages in history:', recentMessages.length);
          
          const conversationHistory = recentMessages.slice(-6).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          }));
          
          console.log('🔄 Formatted conversation history:', conversationHistory);
          console.log('⚡ Calling ChatGPT service...');
          // console.log("API key: "+process.env.OPENAI_API_KEY);
          // Generate AI response
          const aiResponse = await chatGPTService.generateResponse(finalContent, conversationHistory);
          console.log('✅ AI response generated successfully:', aiResponse);
          
          // Save AI response as admin message
          console.log('💾 Saving AI response to database...');
          const aiMsg = await saveMessage(sessionId, "admin", aiResponse);
          console.log('✅ AI message saved:', aiMsg.id);
          
          // Format AI response for frontend
          const formattedAiMessage = {
            sender: aiMsg.sender,
            content: aiMsg.content,
            createdAt: aiMsg.createdAt.toISOString()
          };
          
          // Send AI response to user and admins in this session
          console.log('📤 Broadcasting AI response to session room:', sessionId);
          io.to(sessionId).emit("message", formattedAiMessage);
          console.log('✅ AI response sent successfully');
          
        } catch (aiError) {
          console.error('❌ AI RESPONSE GENERATION FAILED');
          console.error('🔍 Error type:', aiError.constructor.name);
          console.error('📝 Error message:', aiError.message);
          console.error('📋 Full error stack:', aiError.stack);
          
          // Send fallback message
          console.log('🔄 Sending fallback message...');
          const fallbackMsg = await saveMessage(sessionId, "admin", "I'm sorry, I'm having trouble generating a response right now. An admin will assist you shortly.");
          const formattedFallback = {
            sender: fallbackMsg.sender,
            content: fallbackMsg.content,
            createdAt: fallbackMsg.createdAt.toISOString()
          };
          
          io.to(sessionId).emit("message", formattedFallback);
          console.log('✅ Fallback message sent');
        }
      } else {
        console.log('ℹ️ AI mode not enabled for session:', sessionId);
      }
      
      // Update session info
      if (activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId);
        session.lastMessage = finalContent.substring(0, 50) + (finalContent.length > 50 ? "..." : "");
        session.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Update sessions list for all admins
        adminSockets.forEach(adminId => {
          const adminSocket = io.sockets.sockets.get(adminId);
          if (adminSocket) {
            adminSocket.emit("sessions-list", Array.from(activeSessions.values()));
          }
        });
      }
    } catch (error) {
      console.error("Error handling user message:", error);
    } finally {
      // Always remove from processing requests when done
      processingRequests.delete(requestKey);
      
      // Clean up old processing requests (older than 30 seconds)
      setTimeout(() => {
        processingRequests.delete(requestKey);
      }, 30000);
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
      // Send message to all clients in that session room (including admin and user)
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
    
    // Check if this socket was associated with a user session
    const sessionId = socketToSession.get(socket.id);
    if (sessionId && activeSessions.has(sessionId)) {
      console.log(`Socket ${socket.id} was associated with session ${sessionId}`);
      const session = activeSessions.get(sessionId);
      session.isActive = false;
      session.lastMessage = session.lastMessage || "User disconnected";
      session.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Remove socket-session mapping
      socketToSession.delete(socket.id);
      
      // Notify admins about session status change
      adminSockets.forEach(adminId => {
        const adminSocket = io.sockets.sockets.get(adminId);
        if (adminSocket) {
          adminSocket.emit("sessions-list", Array.from(activeSessions.values()));
        }
      });
    }
  });
}
