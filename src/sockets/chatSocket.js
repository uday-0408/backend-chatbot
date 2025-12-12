import { createChatSession, saveMessage } from "../services/chatService.js";

export function chatSocket(io, socket) {
  console.log("Client connected:", socket.id);

  socket.on("init_session", async ({ sessionId }, callback) => {
    if (!sessionId) {
      sessionId = await createChatSession(
        socket.handshake.address,
        socket.handshake.headers["user-agent"]
      );
    }

    socket.join(sessionId);
    callback({ sessionId });
  });

  socket.on("user_message", async ({ sessionId, content }) => {
    const msg = await saveMessage(sessionId, "user", content);
    io.to(sessionId).emit("message", msg);
  });

  socket.on("admin_message", async ({ sessionId, content }) => {
    const msg = await saveMessage(sessionId, "admin", content);
    io.to(sessionId).emit("message", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
}
