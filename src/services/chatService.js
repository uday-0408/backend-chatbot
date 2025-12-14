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

  return prisma.message.create({
    data: {
      chatSessionId: session.id,
      sender,
      content,
      isAI
    }
  });
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
