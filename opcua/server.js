/**
 * OPC UA Server
 * Main server setup dan configuration
 */
const opcua = require("node-opcua");
const { setupNamespace } = require("./namespace");

const port = Number(process.env.OPCUA_PORT || 4334);
const resourcePath = process.env.OPCUA_RESOURCE_PATH || "/opcua";

// Server configuration
const server = new opcua.OPCUAServer({
  port,
  resourcePath,
  buildInfo: {
    manufacturerName: "Rubixis IoT Simulator",
    productName: "OPC UA Machine Simulator",
    productUri: "http://example.com/simulator",
    softwareVersion: "1.0.0",
  },
});

// Namespace setup
server.on("post_initialize", () => {
  const addressSpace = server.engine.addressSpace;

  // Create custom namespace
  const namespaceName = "http://example.com/simulator";
  const namespace = addressSpace.registerNamespace(namespaceName);

  // Setup tags and methods
  setupNamespace(server, namespace);

  console.log("✓ Namespace initialized with CNC and Injection Machine simulations");
});

// Handle server events
server.on("create_session", (session) => {
  console.log("► New client connected:", session.clientDescription.applicationName);
});

server.on("close_session", (session) => {
  console.log("► Client disconnected:", session.clientDescription.applicationName);
});

// Start server
server.start(() => {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  OPC UA Server Simulator started successfully!");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  const actualPort = server.endpoints?.[0]?.port ?? server.options.port ?? port;
  const endpoint = server.endpoints?.[0]?.endpointUrl ?? `opc.tcp://localhost:${actualPort}${resourcePath}`;

  console.log("Server Information:");
  console.log(`  Host: 0.0.0.0`);
  console.log(`  Port: ${actualPort}`);
  console.log(`  Endpoint: ${endpoint}`);
  console.log("");
  console.log("Available Machines:");
  console.log("  • CNC Machine");
  console.log("    - Spindle with temperature monitoring");
  console.log("    - 3-Axis control (X, Y, Z)");
  console.log("    - Production tracking");
  console.log("");
  console.log("  • Injection Molding Machine (Euromap 77)");
  console.log("    - 5 Heating zones with setpoint/actual");
  console.log("    - Nozzle temperature control");
  console.log("    - Injection unit pressure/velocity");
  console.log("    - Clamping force monitoring");
  console.log("    - Production cycle tracking");
  console.log("");
  console.log("  • Bulk_1000_Nodes");
  console.log("    - One folder with 1000 simulated Double nodes");
  console.log("    - Node_0001 through Node_1000 update every 500ms");
  console.log("");
  console.log("Methods Available:");
  console.log("  CNC Machine:");
  console.log("    • StartProgram");
  console.log("    • StopProgram");
  console.log("    • EmergencyStop");
  console.log("    • ResetErrors");
  console.log("");
  console.log("  Injection Machine:");
  console.log("    • StartProduction");
  console.log("    • StopProduction");
  console.log("    • OpenMold");
  console.log("    • CloseMold");
  console.log("    • EmergencyStop");
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Listening for OPC UA clients...");
  console.log("═══════════════════════════════════════════════════════════");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n► Shutting down server...");
  server.shutdown(0, () => {
    console.log("✓ Server stopped");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n► Shutting down server...");
  server.shutdown(0, () => {
    console.log("✓ Server stopped");
    process.exit(0);
  });
});

module.exports = server;
