// import { Server } from "http";
// import config from "./config";
// import app from "./app";
// // import { startSubscriptionExpiryChecker } from "./utils/cronFn/subscriptionExpiryChecker";

// let server: Server;

// // Main function to start the server
// function main() {
//   try {
//     //  Start cron job after app initialization
//     // startSubscriptionExpiryChecker();

//     server = app.listen(config.port, () => {
//       console.log("Server is running on port", config.port);
//     });
//   } catch (error) {
//     console.log(error);
//   }
// }

// // Start the server
// main();

// process.on("unhandledRejection", (err) => {
//   console.log(`😈 unahandledRejection is detected , shutting down ...`, err);
//   if (server) {
//     server.close(() => {
//       process.exit(1);
//     });
//   }
//   process.exit(1);
// });

// process.on("uncaughtException", () => {
//   console.log(`😈 uncaughtException is detected , shutting down ...`);
//   process.exit(1);
// });

import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import config from "./config";
import prisma from "./shared/prisma";

// ---------- WebSocket state ----------
type channelName = string;

const channelClients = new Map<channelName, Set<WebSocket>>();

function safeSend(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastToChannel(
  channelName: channelName,
  data: unknown,
  excludeSocket: WebSocket | null = null
) {
  const clients = channelClients.get(channelName);
  if (!clients) return;
  for (const client of clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    if (excludeSocket && client === excludeSocket) continue;
    safeSend(client, data);
  }
}

// ---------- Server + WS bootstrap ----------
let server: Server | null = null;
let wss: WebSocketServer | null = null;

// Heartbeat helper to detect dead connections
function installHeartbeat(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket & { isAlive?: boolean }) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));
}

async function main() {
  // Start HTTP server
  server = app.listen(config.port, () => {
    console.log("Server is running on port", config.port);
  });

  // Attach WebSocket on the same HTTP server
  wss = new WebSocketServer({ server });
  installHeartbeat(wss);

 wss.on("connection", (ws: WebSocket & { isAlive?: boolean, userId?: string }) => {
  console.log("🔌 New WebSocket connection");
  let currentChannel: string | null = null;

  ws.on("message", async (raw: Buffer) => {
    try {
      const parsed = JSON.parse(raw.toString());

      switch (parsed?.type) {
        case "subscribe": {
          const channelName: string = parsed.channelName;
          if (!channelName || typeof channelName !== "string") {
            safeSend(ws, { type: "error", message: "Invalid channelName" });
            return;
          }

          // add client to channel set
          if (!channelClients.has(channelName)) {
            channelClients.set(channelName, new Set());
          }
          channelClients.get(channelName)!.add(ws);
          currentChannel = channelName;

          safeSend(ws, { type: "subscribed", channelName });
          break;
        }

        case "message": {
          const channelName: string = parsed.channelName;
          const messageText: string = parsed.message;

          if (!channelName || typeof channelName !== "string") {
            safeSend(ws, { type: "error", message: "Invalid channelName" });
            return;
          }

          if (!ws.userId) {
            safeSend(ws, { type: "error", message: "Unauthorized: No userId" });
            return;
          }

          // find or create channel
          let channel = await prisma.channel.findUnique({
            where: { channelName: channelName }
          });

          // if not found → create
          if (!channel) {
            channel = await prisma.channel.create({
              data: {
                channelName,
                person1Id: ws.userId,
                person2Id: parsed.receiverId || "", // must be sent from the client
              }
            });
          }

          // save message
          const newMessage = await prisma.message.create({
            data: {
              message: messageText,
              senderId: ws.userId,
              channelName: channel.channelName,
              files: parsed.files || [], // if has files
            },
            include: {
              sender: {
                select: {
                  id: true,
                  fullName: true,
                  profileImage: true,
                },
              },
            },
          });

          // ৪. broadcast to all clients in this channel
          broadcastToChannel(
            channel.channelName,
            { type: "message", channelName: channel.channelName, data: newMessage },
            ws // exclude sender
          );

          break;
        }

        default:
          safeSend(ws, { type: "error", message: "Unknown message type" });
      }
    } catch (err: any) {
      console.error("WS message error:", err?.message || err);
      safeSend(ws, { type: "error", message: "Malformed JSON" });
    }
  });

  ws.on("close", () => {
    if (currentChannel) {
      const set = channelClients.get(currentChannel);
      if (set) {
        set.delete(ws);
        if (set.size === 0) channelClients.delete(currentChannel);
      }
    }
    console.log("❌ Client disconnected");
  });

  ws.on("error", (err) => {
    console.error("WS socket error:", err);
  });
});

}

main().catch((e) => {
  console.error("Fatal bootstrap error:", e);
  process.exit(1);
});

// ---------- Process-level safety ----------
process.on("unhandledRejection", (err) => {
  console.error("😈 unhandledRejection detected, shutting down...", err);
  if (server) {
    server.close(() => {
      wss?.clients.forEach((c) => c.close());
      wss?.close();
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (err) => {
  console.error("😈 uncaughtException detected, shutting down...", err);
  if (server) {
    server.close(() => {
      wss?.clients.forEach((c) => c.close());
      wss?.close();
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on("SIGINT", () => {
  console.log("👋 SIGINT received. Closing server...");
  if (server) {
    server.close(() => {
      wss?.clients.forEach((c) => c.close());
      wss?.close();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Closing server...");
  if (server) {
    server.close(() => {
      wss?.clients.forEach((c) => c.close());
      wss?.close();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
