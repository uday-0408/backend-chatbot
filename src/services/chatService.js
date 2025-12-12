import prisma from "../config/prisma.js";
import { generateSessionId } from "../utils/generateSessionId.js";

export async function createChatSession(ip, userAgent) {
  const sessionId = generateSessionId();
  await prisma.chatSession.create({
    data: { sessionId, ip, userAgent }
  });
  return sessionId;
}

export async function saveMessage(sessionId, sender, content, isAI = false) {
  const session = await prisma.chatSession.findUnique({
    where: { sessionId }
  });

  if (!session) throw new Error("Chat session not found");

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
