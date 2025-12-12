import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { chatSocket } from "./sockets/chatSocket.js";
import dotenv from "dotenv";
dotenv.config();

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  chatSocket(io, socket);
});


const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log("Server running on", PORT));
