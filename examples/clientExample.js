/**
 * Example Usage - OPC UA Simulator Client
 * Demonstrasi cara menggunakan simulator dari client
 */

const opcua = require("node-opcua");

async function connectAndMonitor() {
  // Create client
  const client = new opcua.OPCUAClient({
    endpointMustExist: false,
  });

  const endpointUrl = "opc.tcp://localhost:4334/opcua";

  try {
    // Connect to server
    await client.connect(endpointUrl);
    console.log("✓ Connected to OPC UA Server");

    // Create session
    const session = await client.createSession();
    console.log("✓ Session created");

    // ============================================
    // Read CNC Tags
    // ============================================
    console.log("\n📊 CNC Machine Data:");
    console.log("─────────────────────────");

    const cncStatus = await session.read({
      nodeId: "ns=1;s=CNC_Status",
      attributeId: opcua.AttributeIds.Value,
    });
    console.log("CNC Status:", cncStatus.value.value);

    const spindleSpeed = await session.read({
      nodeId: "ns=1;s=CNC_Spindle_Speed",
      attributeId: opcua.AttributeIds.Value,
    });
    console.log("Spindle Speed:", spindleSpeed.value.value.toFixed(2), "RPM");

    const xPosition = await session.read({
      nodeId: "ns=1;s=CNC_Axis_X_Position",
      attributeId: opcua.AttributeIds.Value,
    });
    console.log("X Position:", xPosition.value.value.toFixed(2), "mm");

    const totalParts = await session.read({
      nodeId: "ns=1;s=CNC_Production_TotalParts",
      attributeId: opcua.AttributeIds.Value,
    });
    console.log("Total Parts:", totalParts.value.value);

    // ============================================
    // Read Injection Tags
    // ============================================
    console.log("\n📊 Injection Machine Data:");
    console.log("─────────────────────────");

    const injStatus = await session.read({
      nodeId: "ns=1;s=INJ_Status",
      attributeId: opcua.AttributeIds.Value,
    });
    console.log("Injection Status:", injStatus.value.value);

    const zone1Actual = await session.read({
      nodeId: "ns=1;s=INJ_Zone_1_Actual",
      attributeId: opcua.AttributeIds.Value,
    });
    console.log("Zone 1 Temperature:", zone1Actual.value.value.toFixed(2), "°C");

    const injPressure = await session.read({
      nodeId: "ns=1;s=INJ_InjectionUnit_Pressure",
      attributeId: opcua.AttributeIds.Value,
    });
    console.log("Injection Pressure:", injPressure.value.value.toFixed(2), "bar");

    // ============================================
    // Write CNC Power (Turn ON)
    // ============================================
    console.log("\n⚡ Turning ON CNC Machine...");
    await session.write({
      nodeId: "ns=1;s=CNC_Power",
      attributeId: opcua.AttributeIds.Value,
      value: {
        value: {
          dataType: opcua.DataType.Boolean,
          value: true,
        },
      },
    });
    console.log("✓ CNC Power = ON");

    // ============================================
    // Call CNC Method: StartProgram
    // ============================================
    console.log("\n▶️  Calling CNC StartProgram Method...");
    const startResult = await session.call({
      objectId: "ns=1;s=CNC_Methods",
      methodId: "ns=1;s=CNC_StartProgram",
      inputArguments: [],
    });
    console.log("✓ Program Started");

    // ============================================
    // Monitor Data (Real-time)
    // ============================================
    console.log("\n📡 Real-time Monitoring (5 seconds):");
    console.log("─────────────────────────");

    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const speed = await session.read({
        nodeId: "ns=1;s=CNC_Spindle_Speed",
        attributeId: opcua.AttributeIds.Value,
      });

      const temp = await session.read({
        nodeId: "ns=1;s=CNC_Spindle_Temperature",
        attributeId: opcua.AttributeIds.Value,
      });

      console.log(
        `[${i + 1}s] Speed: ${speed.value.value.toFixed(0)} RPM | Temp: ${temp.value.value.toFixed(
          1
        )}°C`
      );
    }

    // ============================================
    // Call CNC Method: StopProgram
    // ============================================
    console.log("\n⏹️  Calling CNC StopProgram Method...");
    await session.call({
      objectId: "ns=1;s=CNC_Methods",
      methodId: "ns=1;s=CNC_StopProgram",
      inputArguments: [],
    });
    console.log("✓ Program Stopped");

    // ============================================
    // Injection Machine Example
    // ============================================
    console.log("\n⚡ Turning ON Injection Machine...");
    await session.write({
      nodeId: "ns=1;s=INJ_Power",
      attributeId: opcua.AttributeIds.Value,
      value: {
        value: {
          dataType: opcua.DataType.Boolean,
          value: true,
        },
      },
    });
    console.log("✓ Injection Power = ON");

    // Start production
    console.log("\n▶️  Starting Production...");
    await session.call({
      objectId: "ns=1;s=INJ_Methods",
      methodId: "ns=1;s=INJ_StartProduction",
      inputArguments: [],
    });
    console.log("✓ Production Started");

    // Monitor injection
    console.log("\n📡 Monitoring Injection (10 seconds):");
    console.log("─────────────────────────");

    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pressure = await session.read({
        nodeId: "ns=1;s=INJ_InjectionUnit_Pressure",
        attributeId: opcua.AttributeIds.Value,
      });

      const cycles = await session.read({
        nodeId: "ns=1;s=INJ_Production_TotalCycles",
        attributeId: opcua.AttributeIds.Value,
      });

      console.log(
        `[${i + 1}s] Pressure: ${pressure.value.value.toFixed(0)} bar | Cycles: ${
          cycles.value.value
        }`
      );
    }

    // Stop production
    console.log("\n⏹️  Stopping Production...");
    await session.call({
      objectId: "ns=1;s=INJ_Methods",
      methodId: "ns=1;s=INJ_StopProduction",
      inputArguments: [],
    });
    console.log("✓ Production Stopped");

    // Clean up
    await session.close();
    await client.disconnect();
    console.log("\n✓ Disconnected");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

// Run
connectAndMonitor().catch(console.error);

/*
USAGE:
------
1. Make sure server is running:
   npm start

2. In another terminal, run this example:
   node examples/clientExample.js

OUTPUT EXAMPLE:
---------------
✓ Connected to OPC UA Server
✓ Session created

📊 CNC Machine Data:
─────────────────────────
CNC Status: IDLE
Spindle Speed: 0.00 RPM
X Position: 234.56 mm
Total Parts: 42

📊 Injection Machine Data:
─────────────────────────
Injection Status: IDLE
Zone 1 Temperature: 45.23 °C
Injection Pressure: 0.00 bar

⚡ Turning ON CNC Machine...
✓ CNC Power = ON

▶️  Calling CNC StartProgram Method...
✓ Program Started

📡 Real-time Monitoring (5 seconds):
─────────────────────────
[1s] Speed: 18234 RPM | Temp: 62.3°C
[2s] Speed: 22145 RPM | Temp: 65.8°C
[3s] Speed: 20987 RPM | Temp: 68.2°C
[4s] Speed: 23456 RPM | Temp: 70.1°C
[5s] Speed: 21234 RPM | Temp: 72.5°C

⏹️  Calling CNC StopProgram Method...
✓ Program Stopped

✓ Disconnected
*/
