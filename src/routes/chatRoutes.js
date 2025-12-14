import express from "express";
import { listChats, getChatById } from "../controllers/chatController.js";

const router = express.Router();

router.get("/chats", listChats);
router.get("/chats/:sessionId", getChatById);

export default router;
