import prisma from "../config/prisma.js";
import { generateSessionId } from "../utils/generateSessionId.js";

export async function createChatSession(ip, userAgent) {
  const sessionId = generateSessionId();
  await prisma.chatSession.create({
    data: { sessionId, ip, userAgent }
  });
  return sessionId;
}

export async function getSession(sessionId) {
  return prisma.chatSession.findUnique({
    where: { sessionId }
  });
}

export async function saveMessage(sessionId, sender, content, isAI = false) {
  console.log(`[chatService.js - saveMessage] Saving message: sessionId=${sessionId}, sender=${sender}, content=${content.substring(0, 50)}..., isAI=${isAI}`);
  
  // Find existing session or create new one
  let session = await prisma.chatSession.findUnique({
    where: { sessionId }
  });

  if (!session) {
    console.log(`Session ${sessionId} not found in database, creating new one`);
    session = await prisma.chatSession.create({
      data: { 
        sessionId,
        ip: 'unknown',
        userAgent: 'unknown'
      }
    });
  }

  const savedMessage = await prisma.message.create({
    data: {
      chatSessionId: session.id,
      sender,
      content,
      isAI
    }
  });
  
  console.log(`[chatService.js - saveMessage] Message saved successfully: id=${savedMessage.id}, isAI=${savedMessage.isAI}`);
  return savedMessage;
}

export async function getMessages(sessionId) {
  const session = await prisma.chatSession.findUnique({
    where: { sessionId },
    include: { messages: true }
  });

  return session?.messages ?? [];
}

export async function getAllChats() {
  return prisma.chatSession.findMany({
    include: { messages: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function getAllSessions() {
  const sessions = await prisma.chatSession.findMany({
    include: { 
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1 // Get only the latest message for preview
      }
    },
    orderBy: { createdAt: "desc" }
  });
  
  return sessions.map(session => ({
    sessionId: session.sessionId,
    user: `User-${session.sessionId.substring(0, 8)}`,
    lastMessage: session.messages[0]?.content || 'No messages yet',
    timestamp: session.messages[0]?.createdAt || session.createdAt,
    isActive: false, // Will be updated by active sessions
    createdAt: session.createdAt
  }));
}
