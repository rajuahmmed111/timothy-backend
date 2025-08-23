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

// ---- (optional) Prisma লাগলে uncomment করো ----
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// ---------- WebSocket state ----------
type ChannelId = string;

const channelClients = new Map<ChannelId, Set<WebSocket>>();

function safeSend(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastToChannel(
  channelId: ChannelId,
  data: unknown,
  excludeSocket: WebSocket | null = null
) {
  const clients = channelClients.get(channelId);
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

  wss.on("connection", (ws: WebSocket) => {
    console.log("🔌 New WebSocket connection");
    let currentChannel: ChannelId | null = null;

    ws.on("message", async (raw: Buffer) => {
      try {
        const parsed = JSON.parse(raw.toString());

        switch (parsed?.type) {
          case "subscribe": {
            const channelId: ChannelId = parsed.channelId;
            if (!channelId || typeof channelId !== "string") {
              safeSend(ws, { type: "error", message: "Invalid channelId" });
              return;
            }

            // add client to channel set
            if (!channelClients.has(channelId)) {
              channelClients.set(channelId, new Set());
            }
            channelClients.get(channelId)!.add(ws);
            currentChannel = channelId;

            safeSend(ws, { type: "subscribed", channelId });
            break;
          }

          case "message": {
            const channelId: ChannelId = parsed.channelId;
            const payload = parsed.message;

            if (!channelId || typeof channelId !== "string") {
              safeSend(ws, { type: "error", message: "Invalid channelId" });
              return;
            }
            if (!channelClients.has(channelId)) {
              safeSend(ws, { type: "error", message: "Channel not found" });
              return;
            }

            // (optional) এখানে payload DB-তে save করতে পারো
            // await prisma.privateMessage.create({ data: { ... } });

            // broadcast to channel (excluding sender)
            broadcastToChannel(
              channelId,
              { type: "message", channelId, payload },
              ws
            );
            break;
          }

          // future: offer/answer/candidate (WebRTC) চাইলে এখানেই add করবে
          default: {
            safeSend(ws, { type: "error", message: "Unknown message type" });
          }
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
