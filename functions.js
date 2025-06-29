let shareCodes = [];
let connections = [];
const GenerateShareCode = () => {
  return Math.floor(10000 + Math.random() * 90000);
};
const generateOriginCode = () => {
  return Math.random().toString(36).substr(2, 8);
};

const addConnection = (ws) => {
  if (connections.includes(ws)) return;
  const wsCode = generateOriginCode();
  connections.push({ wsCode, ws });
  return wsCode;
};

const removeConnection = (ws) => {
  connections = connections.filter((connection) => connection.ws !== ws);
};

const getWsByOriginCode = (wsCode) => {
  // console.log("Get WS By Origin Code", wsCode);
  return connections.find((connection) => connection.wsCode === wsCode);
};

// console.log("Share Code", shareCodes);
const addShareCode = (ws, shareCode) => {
  // console.log("Add Share Code", shareCode);
  shareCodes.push({ ws, shareCode });
};

const removeShareCode = (ws) => {
  shareCodes = shareCodes.filter((code) => code.ws !== ws);
};
const getWsByShareCode = (shareCode) => {
  return shareCodes.find((code) => code.shareCode === shareCode);
};

module.exports = {
  GenerateShareCode,
  generateOriginCode,
  addConnection,
  removeConnection,
  getWsByOriginCode,
  addShareCode,
  removeShareCode,
  getWsByShareCode,
};