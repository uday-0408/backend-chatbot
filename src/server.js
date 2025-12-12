import http from "http";
import { Server } from "socket.io";
import app from "./app.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", () => {
  console.log("Socket connected");
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log("Server running on", PORT));
