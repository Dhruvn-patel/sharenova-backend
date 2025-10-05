const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");
const { GenerateShareCode, generateOriginCode } = require("./functions");

const app = express();
const port = 8889;
app.use(cors());

let NoOfVisitors = 0;
let NoOfFilesTransferred = 0;

const shareCodeMap = new Map();
const originCodeMap = new Map();
const transferMap = new Map();

const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB
const TRANSFER_TIMEOUT = 5 * 60 * 1000; // 5 min

const safeSend = (ws, message, attempt = 0) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const payload = JSON.stringify(message);
  if (ws._socket?.writableLength > MAX_BUFFER_SIZE) {
    const delay = Math.min(100 * 2 ** attempt, 2000);
    return setTimeout(() => safeSend(ws, message, attempt + 1), delay);
  }
  try {
    ws.send(payload);
  } catch {}
};

const cleanupConnection = (ws) => {
  for (const [code, socket] of shareCodeMap) {
    if (socket === ws) shareCodeMap.delete(code);
  }
  for (const [code, socket] of originCodeMap) {
    if (socket === ws) originCodeMap.delete(code);
  }
};

const scheduleTransferCleanup = (destination) => {
  setTimeout(() => {
    if (transferMap.has(destination)) {
      transferMap.delete(destination);
    }
  }, TRANSFER_TIMEOUT);
};

const eventHandlers = {
  HEARTBEAT: (ws) => safeSend(ws, { event: "HEARTBEAT", data: { timestamp: Date.now() } }),

  REQUIST_SHARE_CODE: (ws) => {
    const shareCode = GenerateShareCode();
    shareCodeMap.set(shareCode, ws);
    safeSend(ws, { event: "SHARE_CODE", data: shareCode });
  },

  CONNECTION_REQUEST: (ws, data) => {
    const originCode = generateOriginCode();
    originCodeMap.set(originCode, ws);
    const receiverWs = shareCodeMap.get(Number(data.destination));
    if (receiverWs) {
      safeSend(ws, {
        event: "CONNECTION_REQUEST",
        data: { AssignedOriginCOde: originCode, success: true },
      });
      safeSend(receiverWs, {
        event: "CONNECTION_REQUEST",
        origin: originCode,
      });
    } else {
      safeSend(ws, {
        event: "CONNECTION_REQUEST",
        data: { success: false },
      });
    }
  },

  CONNECTION_ACCEPT: (ws, data) => {
    const receiver = originCodeMap.get(data.destination);
    if (!receiver) return;
    const newCode = generateOriginCode();
    originCodeMap.set(newCode, ws);
    const files = data.data?.files || [];
    NoOfFilesTransferred += files.length;
    safeSend(receiver, {
      event: "CONNECTION_ACCEPT",
      origin: newCode,
      data: { success: true, files },
    });
  },

  FILE_CHUNK: (_, data) => {
    const { chunk, totalChunks, chunkIndex, fileName } = data.data;
    const destination = data.destination;
    const receiver = originCodeMap.get(destination);
    if (!receiver) return;

    if (!transferMap.has(destination)) {
      transferMap.set(destination, {
        total: totalChunks,
        received: 0,
        fileName,
      });
      scheduleTransferCleanup(destination);
    }

    const transfer = transferMap.get(destination);
    transfer.received++;

    safeSend(receiver, {
      event: "FILE_CHUNK",
      data: { chunk, chunkIndex, totalChunks, fileName },
    });

    if (transfer.received === transfer.total) {
      safeSend(receiver, { event: "FILE_COMPLETE", data: { fileName } });
      transferMap.delete(destination);
    }
  },

  DEFAULT: (_, data) => {
    const receiver = originCodeMap.get(data.destination);
    if (receiver) safeSend(receiver, { event: data.event, data: data.data });
  },
};

const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }
    const handler = eventHandlers[data.event] || eventHandlers.DEFAULT;
    handler(ws, data);
  });

  ws.on("close", () => cleanupConnection(ws));
});

app.put("/visit", (_, res) => res.json({ NoOfVisitors: ++NoOfVisitors }));
app.get("/visit", (_, res) => res.json({ NoOfVisitors, NoOfFilesTransferred }));

const server = app.listen(port);

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

module.exports = server;
