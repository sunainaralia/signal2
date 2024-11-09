"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const morgan_1 = __importDefault(require("morgan"));
const socket_io_1 = require("socket.io");
let users = [];
let liveSessions = [];
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)("combined"));
app.use(express_1.default.json());
// Endpoint to view live sessions
app.get("/live-sessions", (req, res) => {
    res.json({ liveSessions });
});
// Middleware to authenticate users
io.use((socket, next) => {
    const { callerId } = socket.handshake.query;
    if (callerId) {
        socket.data.user = callerId;
        next();
    }
    else {
        console.log("No caller ID found");
        next(new Error("No caller ID found"));
    }
});
// Handle socket connections
io.on("connection", (socket) => {
    const userId = socket.data.user;
    console.log("User connected:", userId);
    socket.join(userId);
    // Notify user about existing live sessions
    io.to(userId).emit("live-sessions", { liveSessions });
    // Start a live session
    socket.on("start-live", ({ sessionName }) => {
        console.log(`${userId} started a live session: ${sessionName}`);
        const session = { hostId: userId, sessionName };
        liveSessions.push(session);
        io.emit("new-live-session", session);
    });
    // Handle join live session
    socket.on("join-live", ({ hostId }) => {
        console.log(`${userId} is joining the live session hosted by ${hostId}`);
        io.to(hostId).emit("incoming-viewer", { viewerId: userId });
    });
    // Handle offer from broadcaster to viewer
    socket.on("offer", ({ to, offer }) => {
        console.log(`Offer from ${userId} to ${to}`);
        io.to(to).emit("offer", { from: userId, offer });
    });
    // Handle answer from viewer to broadcaster
    socket.on("answer", ({ to, answer }) => {
        console.log(`Answer from ${userId} to ${to}`);
        io.to(to).emit("answer", { from: userId, answer });
    });
    // Handle ICE candidates
    socket.on("ice-candidate", ({ to, candidate }) => {
        console.log(`ICE Candidate from ${userId} to ${to}`);
        io.to(to).emit("ice-candidate", { from: userId, candidate });
    });
    // Handle disconnect
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${userId}`);
        liveSessions = liveSessions.filter((session) => session.hostId !== userId);
        io.emit("live-session-ended", { hostId: userId });
    });
});
// Start server
const PORT = process.env.PORT || 8088;
httpServer.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
//# sourceMappingURL=index.js.map