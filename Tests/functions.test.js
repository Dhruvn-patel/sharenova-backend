const {
  GenerateShareCode,
  generateOriginCode,
  addConnection,
  removeConnection,
  getWsByOriginCode,
  addShareCode,
  removeShareCode,
  getWsByShareCode,
} = require("../functions"); // Adjust the path as needed

describe("Helper Functions", () => {
  test("GenerateShareCode should generate a 5-digit number", () => {
    const code = GenerateShareCode();
    expect(code).toBeGreaterThanOrEqual(10000);
    expect(code).toBeLessThanOrEqual(99999);
  });

  test("generateOriginCode should generate a random 8-character string", () => {
    const code = generateOriginCode();
    expect(code).toHaveLength(8);
    expect(typeof code).toBe("string");
  });

  test("addConnection should add a connection and return a code", () => {
    const wsMock = {}; // Mock WebSocket object
    const wsCode = addConnection(wsMock);
    expect(wsCode).toHaveLength(8);
  });

  test("removeConnection should remove a connection", () => {
    const wsMock = {}; // Mock WebSocket object
    const wsCode = addConnection(wsMock);
    removeConnection(wsMock);
    const connection = getWsByOriginCode(wsCode);
    expect(connection).toBeUndefined();
  });

  test("getWsByOriginCode should return the correct WebSocket", () => {
    const wsMock = {}; // Mock WebSocket object
    const wsCode = addConnection(wsMock);
    const wsConnection = getWsByOriginCode(wsCode);
    expect(wsConnection.wsCode).toBe(wsCode);
  });

  test("addShareCode should add a share code", () => {
    const wsMock = {}; // Mock WebSocket object
    const shareCode = GenerateShareCode();
    addShareCode(wsMock, shareCode);
    const shareCodeObj = getWsByShareCode(shareCode);
    expect(shareCodeObj.shareCode).toBe(shareCode);
  });

  test("removeShareCode should remove a share code", () => {
    const wsMock = {}; // Mock WebSocket object
    const shareCode = GenerateShareCode();
    addShareCode(wsMock, shareCode);
    removeShareCode(wsMock);
    const shareCodeObj = getWsByShareCode(shareCode);
    expect(shareCodeObj).toBeUndefined();
  });

  test("getWsByShareCode should return the correct WebSocket", () => {
    const wsMock = {}; // Mock WebSocket object
    const shareCode = GenerateShareCode();
    addShareCode(wsMock, shareCode);
    const shareCodeObj = getWsByShareCode(shareCode);
    expect(shareCodeObj.ws).toBe(wsMock);
  });

});
