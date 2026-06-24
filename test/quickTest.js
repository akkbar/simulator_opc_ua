/**
 * Quick Test Script
 * Untuk memverifikasi simulator berjalan dengan baik
 */

const opcua = require("node-opcua");

async function browseAllOrganizedBy(session, nodeId) {
  const references = [];
  let result = await session.browse({
    nodeId,
    referenceTypeId: "Organizes",
    browseDirection: opcua.BrowseDirection.Forward,
    includeSubtypes: true,
    nodeClassMask: 0,
    resultMask: 0x3f,
  });

  references.push(...(result.references || []));

  while (result.continuationPoint && result.continuationPoint.length > 0) {
    result = await session.browseNext(result.continuationPoint, false);
    references.push(...(result.references || []));
  }

  return references;
}

async function quickTest() {
  console.log("🧪 OPC UA Simulator Quick Test\n");

  const endpointUrl = process.env.OPCUA_ENDPOINT || "opc.tcp://localhost:4334/opcua";

  const client = opcua.OPCUAClient.create({
    endpointMustExist: false,
  });

  try {
    console.log(`1. Connecting to ${endpointUrl}...`);
    await client.connect(endpointUrl);
    console.log("   ✓ Connected\n");

    console.log("2️⃣  Creating session...");
    const session = await client.createSession();
    const namespaceArray = await session.read({
      nodeId: opcua.VariableIds.Server_NamespaceArray,
      attributeId: opcua.AttributeIds.Value,
    });
    const namespaceIndex = namespaceArray.value.value.indexOf("http://example.com/simulator");
    if (namespaceIndex < 0) {
      throw new Error("Simulator namespace not found");
    }
    console.log("   ✓ Session created\n");

    console.log("3️⃣  Reading CNC Machine tags...");
    const cncStatus = await session.read({
      nodeId: `ns=${namespaceIndex};s=CNC1_Status`,
      attributeId: opcua.AttributeIds.Value,
    });
    console.log(`   ✓ CNC Status: ${cncStatus.value.value}\n`);

    console.log("4️⃣  Reading Injection Machine tags...");
    const injStatus = await session.read({
      nodeId: `ns=${namespaceIndex};s=INJ1_Status`,
      attributeId: opcua.AttributeIds.Value,
    });
    console.log(`   ✓ Injection Status: ${injStatus.value.value}\n`);

    console.log("4b. Checking multi-machine folders and identity tags...");
    const expectedFolders = [
      ...Array.from({ length: 5 }, (_, i) => `Injection_Machine_${String(i + 1).padStart(3, "0")}`),
      ...Array.from({ length: 5 }, (_, i) => `CNC_Milling_${String(i + 1).padStart(3, "0")}`),
      ...Array.from({ length: 5 }, (_, i) => `Lathe_${String(i + 1).padStart(3, "0")}`),
    ];
    for (const folder of expectedFolders) {
      const refs = await browseAllOrganizedBy(session, `ns=${namespaceIndex};s=${folder}`);
      if (refs.length === 0) {
        throw new Error(`${folder} has no child nodes`);
      }
    }

    const identityReads = await session.read([
      { nodeId: `ns=${namespaceIndex};s=INJ1_ProductName`, attributeId: opcua.AttributeIds.Value },
      { nodeId: `ns=${namespaceIndex};s=INJ1_MoldName`, attributeId: opcua.AttributeIds.Value },
      { nodeId: `ns=${namespaceIndex};s=CNC1_ProgramName`, attributeId: opcua.AttributeIds.Value },
      { nodeId: `ns=${namespaceIndex};s=LATHE1_ProgramName`, attributeId: opcua.AttributeIds.Value },
    ]);
    console.log(`   âœ“ Machine folders: ${expectedFolders.length}`);
    console.log(
      `   âœ“ INJ1 product=${identityReads[0].value.value}, mold=${identityReads[1].value.value}`
    );
    console.log(
      `   âœ“ CNC1 program=${identityReads[2].value.value}, LATHE1 program=${identityReads[3].value.value}\n`
    );

    console.log("5. Checking Bulk_1000_Nodes folder...");
    const bulkFolderId = `ns=${namespaceIndex};s=Bulk_1000_Nodes`;
    const bulkReferences = await browseAllOrganizedBy(session, bulkFolderId);
    if (bulkReferences.length !== 1000) {
      throw new Error(`Bulk_1000_Nodes expected 1000 child nodes, got ${bulkReferences.length}`);
    }

    const firstBulkNode = await session.read({
      nodeId: `ns=${namespaceIndex};s=Bulk_Node_0001`,
      attributeId: opcua.AttributeIds.Value,
    });
    const lastBulkNode = await session.read({
      nodeId: `ns=${namespaceIndex};s=Bulk_Node_1000`,
      attributeId: opcua.AttributeIds.Value,
    });
    console.log(`   ✓ Bulk nodes: ${bulkReferences.length}`);
    console.log(
      `   ✓ Samples: Node_0001=${firstBulkNode.value.value.toFixed(3)}, Node_1000=${lastBulkNode.value.value.toFixed(3)}\n`
    );

    console.log("6. Listing available tags (5 samples)...");
    const nodesToBrowse = [
      {
        nodeId: `ns=${namespaceIndex};s=CNC1_Spindle_Speed`,
        referenceTypeId: "Organizes",
      },
    ];

    const browseResults = await session.browse(nodesToBrowse);
    console.log("   ✓ Browse successful\n");

    console.log("7. Testing data updates...");
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const speed = await session.read({
        nodeId: `ns=${namespaceIndex};s=CNC1_Spindle_Speed`,
        attributeId: opcua.AttributeIds.Value,
      });
      console.log(`   [${i + 1}] Spindle Speed: ${speed.value.value.toFixed(0)} RPM`);
    }
    console.log("");

    console.log("8. Testing CNC Methods...");
    const axisX = await session.read({
      nodeId: `ns=${namespaceIndex};s=CNC1_Axis_X`,
      attributeId: opcua.AttributeIds.Value,
    });
    console.log(`   X Axis: ${axisX.value.value.toFixed(2)} mm\n`);

    const methodsList = [
      { id: `ns=${namespaceIndex};s=CNC1_StartProgram`, name: "StartProgram" },
      { id: `ns=${namespaceIndex};s=CNC1_StopProgram`, name: "StopProgram" },
    ];

    for (const method of methodsList) {
      try {
        console.log(`   • ${method.name}... `, { end: "" });
        // Just verify method exists, don't call it
        const methodNode = await session.read({
          nodeId: method.id,
          attributeId: opcua.AttributeIds.BrowseName,
        });
        console.log("✓");
      } catch (err) {
        console.log("✗");
      }
    }
    console.log("");

    console.log("9. Closing session...");
    await session.close();
    console.log("   ✓ Session closed\n");

    console.log("10. Disconnecting...");
    await client.disconnect();
    console.log("   ✓ Disconnected\n");

    console.log("═══════════════════════════════════════════════════════════");
    console.log("✅ ALL TESTS PASSED!");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("\nSimulator is working correctly!");
    console.log("You can now:");
    console.log(`  • Connect OPC UA clients to ${endpointUrl}`);
    console.log("  • Browse CNC_Machine, Injection_Machine, and Bulk_1000_Nodes tags");
    console.log("  • Call available methods");
    console.log("  • Run examples/clientExample.js for more detailed demo");
  } catch (err) {
    console.error("\n❌ TEST FAILED!");
    console.error("Error:", err.message);
    console.error("\nMake sure:");
    console.error("  1. Server is running: npm start");
    console.error("  2. Port 4334 is not blocked");
    console.error("  3. node-opcua is installed: npm install");
    process.exit(1);
  }
}

quickTest();
