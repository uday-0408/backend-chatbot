import { getAllChats, getMessages } from "../services/chatService.js";

export async function listChats(req, res) {
  const chats = await getAllChats();
  res.json(chats);
}

export async function getChatById(req, res) {
  const messages = await getMessages(req.params.sessionId);
  res.json(messages);
}
