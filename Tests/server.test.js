const WebSocket = require("ws");
const server = require("../server");
const url = "http://localhost:8888";
const {
  getWsByShareCode,
  GenerateShareCode,
  generateOriginCode,
} = require("../functions");
describe("Websocket server Full Flow", () => {
  let client1;
  let client2;
  let client3;
  let shareCode;
  let originCode;
  beforeAll((done) => {
    client1 = new WebSocket(url);
    client2 = new WebSocket(url);
    client3 = new WebSocket(url);

    let clientsConnected = 0;

    const checkAllConnected = () => {
      clientsConnected++;
      if (clientsConnected === 3) {
        done();
      }
    };

    client1.on("open", checkAllConnected);
    client2.on("open", checkAllConnected);
    client3.on("open", checkAllConnected);

    const handleError = (err) => {
      console.error("WebSocket error:", err);
      done(err); // Fail the test if there's an error during connection
    };

    client1.on("error", handleError);
    client2.on("error", handleError);
    client3.on("error", handleError);
  });
  afterAll(() => {
    client1.close();
    client2.close();
    client3.close();
    server.close();
  });
  test("should receive a heartbeat response", (done) => {
    client1.on("message", (message) => {
      const data = JSON.parse(message);
      if (data.event === "HEARTBEAT") {
        done();
      }
    });

    client1.send(JSON.stringify({ event: "HEARTBEAT" }));
  });

  test("should send 5-digit random code", (done) => {
    client1.on("message", (message) => {
      const data = JSON.parse(message);
      if (data.event === "SHARE_CODE") {
        shareCode = data.data;
        expect(shareCode).toBeGreaterThanOrEqual(10000);
        expect(shareCode).toBeLessThanOrEqual(99999);
        done();
      }
    });
    client1.send(JSON.stringify({ event: "REQUIST_SHARE_CODE" }));
  });

  test("should send CONNECTION_REQUEST to both sender and receiver with origin code", (done) => {
    client2.on("message", (message) => {
      const data = JSON.parse(message);
      if (data.event === "CONNECTION_REQUEST") {
        expect(data.data.success).toBe(true);
        originCode = data.data.AssignedOriginCOde;
        done();
      }
    });
    client1.on("message", (message) => {
      const data = JSON.parse(message);
      if (data.event === "CONNECTION_REQUEST") {
        expect(data.origin).toBe(originCode);
        done();
      }
    });
    client2.send(
      JSON.stringify({ event: "CONNECTION_REQUEST", destination: shareCode })
    );
  });

  test("should receive origin code of client2 at client1 with files info", (done) => {
    client2.on("message", (message) => {
      const data = JSON.parse(message);
      if (data.event === "CONNECTION_ACCEPT") {
        expect(data.data.success).toBe(true);
        //console.log("data:", data);
        done();
      }
    });
    client1.send(
      JSON.stringify({
        event: "CONNECTION_ACCEPT",
        destination: originCode,
        data: { files: [{ filename: "Test file", size: "20MB" }] },
      })
    );
  });

  test("should receive sucess==false when non existent sharecode is passed to CONNECTION_REQUEST", (done) => {
    let tempCode = GenerateShareCode();
    while (getWsByShareCode(tempCode)) {
      tempCode = generateOriginCode();
    }
    client3.on("message", (message) => {
      const data = JSON.parse(message);
      if (data.event === "CONNECTION_REQUEST") {
        expect(data.data.success).toBe(false);
        done();
      }
    });
    client3.send(
      JSON.stringify({ event: "CONNECTION_REQUEST", destination: tempCode })
    );
  });
});
