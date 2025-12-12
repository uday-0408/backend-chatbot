import { getAllChats, getMessages } from "../services/chatService.js";

export async function listChats(req, res) {
  try {
    const chats = await getAllChats();
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getChatById(req, res) {
  try {
    const messages = await getMessages(req.params.sessionId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
