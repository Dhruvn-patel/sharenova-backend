const e = require("express");
const express = require("express");
const WebSocket = require("ws");
const {
  GenerateShareCode,
  generateOriginCode,
  addConnection,
  getWsByOriginCode,
  addShareCode,
  removeShareCode,
  removeConnection,
  getWsByShareCode,
} = require("./functions");
const app = express();
const port = 8889;
const cors = require("cors");
app.use(cors());
let NoOfVisitors = 0;
let NoOfFilesTransfered = 0;
// Create a WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket connection
wss.on("connection", (ws) => {
  //console.log("WebSocket connection established");
  // Handle incoming messages
  ws.on("message", (message) => {
    //console.log(`Received message: ${message}`);
    const data = JSON.parse(message);
    switch (data.event) {
      case "HEARTBEAT":
        ws.send(
          JSON.stringify({
            event: "HEARTBEAT",
            data: { timestamp: new Date() },
          })
        );
        break;
      case "REQUIST_SHARE_CODE":
        const shareCode = GenerateShareCode();
        ws.send(JSON.stringify({ event: "SHARE_CODE", data: shareCode }));
        addShareCode(ws, shareCode);
        break;
      case "CONNECTION_REQUEST":
        //console.log("Connection Request", parseInt(data.destination));
        const wsCode = addConnection(ws);
        let receiverWs = getWsByShareCode(parseInt(data.destination));
        setTimeout(() => {
          if (receiverWs) {
            ws.send(
              JSON.stringify({
                event: "CONNECTION_REQUEST",
                data: { AssignedOriginCOde: wsCode, success: true },
              })
            );
            receiverWs.ws.send(
              JSON.stringify({
                event: "CONNECTION_REQUEST",
                origin: wsCode,
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                event: "CONNECTION_REQUEST",
                data: { success: false },
              })
            );
          }
        }, 1000);

        break;
      case "CONNECTION_ACCEPT":
        //console.log("Connection Accept", data.destination);
        const receiverConnection = getWsByOriginCode(data.destination);
        const wscodes = addConnection(ws);
        if (receiverConnection) {
          receiverConnection.ws.send(
            JSON.stringify({
              event: "CONNECTION_ACCEPT",
              origin: wscodes,
              data: { success: true, files: data.data.files },
            })
          );
          NoOfFilesTransfered += data.data.files.length;
        }
        break;
      default:
        //console.log(data.event, data.data);
        const receiveConnn = getWsByOriginCode(data.destination);
        if (receiveConnn) {
          receiveConnn.ws.send(
            JSON.stringify({
              event: data.event,
              data: data.data,
            })
          );
        }
        break;
    }
  });
  // Handle WebSocket close event
  ws.on("close", () => {
    removeShareCode(ws);
    removeConnection(ws);
  });
});

app.put("/visit", (req, res) => {
  NoOfVisitors++;
  res.json({ NoOfVisitors });
});
app.get("/visit", (req, res) => {
  res.json({ NoOfVisitors, NoOfFilesTransfered });
});
// Create an HTTP server
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Upgrade HTTP server to WebSocket server
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

module.exports = server;
