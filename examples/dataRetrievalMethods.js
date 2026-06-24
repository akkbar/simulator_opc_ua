/**
 * Data Retrieval Methods Example
 * Demonstrasi cara menggunakan methods yang return data
 * (Data yang hanya bisa di-read lewat method call)
 */

const opcua = require("node-opcua");

async function demonstrateDataMethods() {
  const client = new opcua.OPCUAClient({
    endpointMustExist: false,
  });

  const endpointUrl = "opc.tcp://localhost:4334/opcua";

  try {
    await client.connect(endpointUrl);
    console.log("✓ Connected to OPC UA Server\n");

    const session = await client.createSession();
    console.log("✓ Session created\n");

    // ============================================
    // CNC MACHINE DATA RETRIEVAL METHODS
    // ============================================
    console.log("═══════════════════════════════════════════════════════════");
    console.log("         CNC MACHINE - DATA RETRIEVAL METHODS");
    console.log("═══════════════════════════════════════════════════════════\n");

    // 1. Get Full State
    console.log("1️⃣  Calling CNC GetFullState()...\n");
    const cncStateResult = await session.call({
      objectId: "ns=1;s=CNC_Methods",
      methodId: "ns=1;s=CNC_GetFullState",
      inputArguments: [],
    });

    if (cncStateResult.statusCode === opcua.StatusCodes.Good) {
      const cncState = JSON.parse(cncStateResult.outputArguments[0].value);
      console.log("✓ Full Machine State:");
      console.log(`  Machine: ${cncState.name}`);
      console.log(`  Status: ${cncState.status}`);
      console.log(`  Power: ${cncState.power}`);
      console.log(`  Spindle Speed: ${cncState.spindle.speed.toFixed(0)} RPM`);
      console.log(`  Temperature: ${cncState.spindle.temperature.toFixed(1)}°C`);
      console.log(`  X Position: ${cncState.axes.X.position.toFixed(2)} mm`);
      console.log(`  Production: ${cncState.production.totalParts} parts\n`);
    }

    // 2. Get Production Report
    console.log("2️⃣  Calling CNC GetProductionReport()...\n");
    const cncProdResult = await session.call({
      objectId: "ns=1;s=CNC_Methods",
      methodId: "ns=1;s=CNC_GetProductionReport",
      inputArguments: [],
    });

    if (cncProdResult.statusCode === opcua.StatusCodes.Good) {
      const prodReport = JSON.parse(cncProdResult.outputArguments[0].value);
      console.log("✓ Production Report:");
      console.log(`  Total Parts: ${prodReport.totalProduced}`);
      console.log(`  Good Parts: ${prodReport.goodParts}`);
      console.log(`  Bad Parts: ${prodReport.badParts}`);
      console.log(`  Efficiency: ${prodReport.efficiency}`);
      console.log(`  Status: ${prodReport.status}\n`);
    }

    // 3. Get Error Log
    console.log("3️⃣  Calling CNC GetErrorLog()...\n");
    const cncErrorResult = await session.call({
      objectId: "ns=1;s=CNC_Methods",
      methodId: "ns=1;s=CNC_GetErrorLog",
      inputArguments: [],
    });

    if (cncErrorResult.statusCode === opcua.StatusCodes.Good) {
      const errorLog = JSON.parse(cncErrorResult.outputArguments[0].value);
      console.log("✓ Error Log:");
      console.log(`  Machine Status: ${errorLog.machineStatus}`);
      console.log(`  Error Count: ${errorLog.errorCount}`);
      console.log(`  Warning Count: ${errorLog.warningCount}`);
      console.log(`  Errors: ${JSON.stringify(errorLog.errors)}`);
      console.log(`  Warnings: ${JSON.stringify(errorLog.warnings)}\n`);
    }

    // 4. Get Diagnostics
    console.log("4️⃣  Calling CNC GetDiagnostics()...\n");
    const cncDiagResult = await session.call({
      objectId: "ns=1;s=CNC_Methods",
      methodId: "ns=1;s=CNC_GetDiagnostics",
      inputArguments: [],
    });

    if (cncDiagResult.statusCode === opcua.StatusCodes.Good) {
      const diag = JSON.parse(cncDiagResult.outputArguments[0].value);
      console.log("✓ Diagnostics Report:");
      console.log(`  Machine: ${diag.machineName}`);
      console.log(`  Status: ${diag.status}`);
      console.log(`  Spindle Speed: ${diag.spindle.speed} RPM`);
      console.log(`  Spindle Load: ${diag.spindle.load}%`);
      console.log(`  X Position: ${diag.axes.X.position} mm`);
      console.log(`  Y Position: ${diag.axes.Y.position} mm`);
      console.log(`  Z Position: ${diag.axes.Z.position} mm\n`);
    }

    // ============================================
    // INJECTION MACHINE DATA RETRIEVAL METHODS
    // ============================================
    console.log("═══════════════════════════════════════════════════════════");
    console.log("       INJECTION MACHINE - DATA RETRIEVAL METHODS");
    console.log("═══════════════════════════════════════════════════════════\n");

    // 1. Get Full State
    console.log("1️⃣  Calling Injection GetFullState()...\n");
    const injStateResult = await session.call({
      objectId: "ns=1;s=INJ_Methods",
      methodId: "ns=1;s=INJ_GetFullState",
      inputArguments: [],
    });

    if (injStateResult.statusCode === opcua.StatusCodes.Good) {
      const injState = JSON.parse(injStateResult.outputArguments[0].value);
      console.log("✓ Full Machine State:");
      console.log(`  Machine: ${injState.name}`);
      console.log(`  Status: ${injState.status}`);
      console.log(`  Cycles: ${injState.machineStatus.cycleCount}`);
      console.log(`  Clamp Force: ${injState.clamping.force.toFixed(1)} tons`);
      console.log(`  Injection Pressure: ${injState.injectionUnit.pressure.toFixed(0)} bar`);
      console.log(`  Screw Temperature: ${injState.screw.temperature.toFixed(1)}°C\n`);
    }

    // 2. Get Production Report
    console.log("2️⃣  Calling Injection GetProductionReport()...\n");
    const injProdResult = await session.call({
      objectId: "ns=1;s=INJ_Methods",
      methodId: "ns=1;s=INJ_GetProductionReport",
      inputArguments: [],
    });

    if (injProdResult.statusCode === opcua.StatusCodes.Good) {
      const prodReport = JSON.parse(injProdResult.outputArguments[0].value);
      console.log("✓ Production Report:");
      console.log(`  Total Cycles: ${prodReport.totalCycles}`);
      console.log(`  Good Parts: ${prodReport.goodParts}`);
      console.log(`  Bad Parts: ${prodReport.badParts}`);
      console.log(`  Average Cycle Time: ${prodReport.averageCycleTime}ms`);
      console.log(`  Total Weight: ${prodReport.totalWeight}kg`);
      console.log(`  Efficiency: ${prodReport.efficiency}\n`);
    }

    // 3. Get Temperature Report
    console.log("3️⃣  Calling Injection GetTemperatureReport()...\n");
    const injTempResult = await session.call({
      objectId: "ns=1;s=INJ_Methods",
      methodId: "ns=1;s=INJ_GetTemperatureReport",
      inputArguments: [],
    });

    if (injTempResult.statusCode === opcua.StatusCodes.Good) {
      const tempReport = JSON.parse(injTempResult.outputArguments[0].value);
      console.log("✓ Temperature Report:");
      tempReport.heatingZones.forEach((zone) => {
        console.log(
          `  Zone ${zone.zone}: ${zone.actual}°C (Setpoint: ${zone.setpoint}°C, Enabled: ${zone.enabled})`
        );
      });
      console.log(
        `  Nozzle: ${tempReport.nozzle.actual}°C (Setpoint: ${tempReport.nozzle.setpoint}°C)`
      );
      console.log(
        `  Mold: ${tempReport.mold.actual}°C (Setpoint: ${tempReport.mold.setpoint}°C)\n`
      );
    }

    // 4. Get Alarm Log
    console.log("4️⃣  Calling Injection GetAlarmLog()...\n");
    const injAlarmResult = await session.call({
      objectId: "ns=1;s=INJ_Methods",
      methodId: "ns=1;s=INJ_GetAlarmLog",
      inputArguments: [],
    });

    if (injAlarmResult.statusCode === opcua.StatusCodes.Good) {
      const alarmLog = JSON.parse(injAlarmResult.outputArguments[0].value);
      console.log("✓ Alarm Log:");
      console.log(`  Machine Status: ${alarmLog.machineStatus}`);
      console.log(`  Alarm Count: ${alarmLog.alarmCount}`);
      console.log(`  Warning Count: ${alarmLog.warningCount}`);
      console.log(`  Alarms: ${JSON.stringify(alarmLog.alarms)}`);
      console.log(`  Warnings: ${JSON.stringify(alarmLog.warnings)}\n`);
    }

    // 5. Get Diagnostics
    console.log("5️⃣  Calling Injection GetDiagnostics()...\n");
    const injDiagResult = await session.call({
      objectId: "ns=1;s=INJ_Methods",
      methodId: "ns=1;s=INJ_GetDiagnostics",
      inputArguments: [],
    });

    if (injDiagResult.statusCode === opcua.StatusCodes.Good) {
      const diag = JSON.parse(injDiagResult.outputArguments[0].value);
      console.log("✓ Diagnostics Report:");
      console.log(`  Machine: ${diag.machineName}`);
      console.log(`  Status: ${diag.status}`);
      console.log(`  Cycle Count: ${diag.cycleInfo.cycleCount}`);
      console.log(`  Injection Pressure: ${diag.injectionUnit.pressure} bar`);
      console.log(`  Clamping Force: ${diag.clamping.force} tons`);
      console.log(`  Screw Speed: ${diag.screw.speed} RPM\n`);
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log("═══════════════════════════════════════════════════════════");
    console.log("                      SUMMARY");
    console.log("═══════════════════════════════════════════════════════════\n");

    console.log("✅ Data Retrieval Methods Available:\n");

    console.log("CNC Machine:");
    console.log("  • GetFullState() → Complete machine state");
    console.log("  • GetProductionReport() → Production statistics");
    console.log("  • GetErrorLog() → Error and warning history");
    console.log("  • GetDiagnostics() → Detailed diagnostics\n");

    console.log("Injection Machine:");
    console.log("  • GetFullState() → Complete machine state");
    console.log("  • GetProductionReport() → Production statistics");
    console.log("  • GetTemperatureReport() → All temperature zones");
    console.log("  • GetAlarmLog() → Alarm and warning history");
    console.log("  • GetDiagnostics() → Detailed diagnostics\n");

    console.log("All methods return JSON format data!");
    console.log("═══════════════════════════════════════════════════════════\n");

    // Clean up
    await session.close();
    await client.disconnect();
    console.log("✓ Disconnected");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

demonstrateDataMethods().catch(console.error);

/*
USAGE:
------
1. Make sure server is running:
   npm start

2. In another terminal, run this example:
   node examples/dataRetrievalMethods.js

This demonstrates:
- Calling methods that retrieve data
- Parsing JSON responses
- Using method output arguments
- Real-time data extraction via OPC UA methods
*/
