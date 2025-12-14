import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  socket.emit("init_session", {}, (response) => {
    console.log("Session initialized:", response);

    socket.emit("user_message", {
      sessionId: response.sessionId,
      content: "Testing message!"
    });
  });
});

socket.on("message", (msg) => {
  console.log("New message:", msg);
});
