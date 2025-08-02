const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const generateFakeTrade = () => ({
  id: Date.now(),
  symbol: ["EURUSD", "BTCUSD", "XAUUSD"][Math.floor(Math.random() * 3)],
  lotSize: +(Math.random() * 2).toFixed(2),
  pnl: +(Math.random() * 100 - 50).toFixed(2),
  timestamp: new Date().toISOString(),
});

setInterval(() => {
  const trade = generateFakeTrade();
  io.emit("new_trade", trade);
}, 2000); // Every 2 seconds

io.on("connection", (socket) => {
  console.log("Client connected");
  socket.emit("welcome", "Connected to Tradia simulated trade stream!");
});

server.listen(4000, () => {
  console.log("Simulated trade server running on port 4000");
});
