/**
 * OPC UA Namespace Setup
 * Mendefinisikan tag tree dan methods untuk simulasi multi-machine.
 */
const opcua = require("node-opcua");
const CNCMachine = require("../models/cncMachine");
const InjectionMachine = require("../models/injectionMachine");

const BULK_NODE_COUNT = 1000;

const injectionMachines = createInjectionMachines();
const cncMachines = createCncMachines("CNC_Milling", "CNC Milling");
const latheMachines = createCncMachines("Lathe", "Lathe");
const allCuttingMachines = [...cncMachines, ...latheMachines];

function createInjectionMachines() {
  return Array.from({ length: 5 }, (_, index) => {
    const number = index + 1;
    return new InjectionMachine({
      name: `Injection_Machine_${String(number).padStart(3, "0")}`,
      autoStart: true,
      productIndex: index,
    });
  });
}

function createCncMachines(prefix, machineType) {
  const programs =
    machineType === "Lathe"
      ? ["PRG_TURN_SHAFT_A", "PRG_BORE_BUSHING_B", "PRG_THREAD_PIN_C", "PRG_FACE_FLANGE_D", "PRG_GROOVE_RING_E"]
      : ["PRG_FACE_PLATE_A", "PRG_POCKET_BRACKET_B", "PRG_DRILL_HOUSING_C", "PRG_CONTOUR_COVER_D", "PRG_SLOT_BASE_E"];

  return Array.from({ length: 5 }, (_, index) => {
    const number = index + 1;
    return new CNCMachine({
      name: `${prefix}_${String(number).padStart(3, "0")}`,
      machineType,
      autoStart: true,
      programIndex: index,
      programs,
    });
  });
}

function setupNamespace(server, namespace) {
  const addressSpace = server.engine.addressSpace;
  patchNamespaceApi(namespace);

  const rootFolder = addressSpace.rootFolder.objects;
  const bulkSimulation = createBulkNodeSimulation(namespace, rootFolder);

  injectionMachines.forEach((machine, index) => {
    addInjectionMachine(namespace, rootFolder, machine, `INJ${index + 1}`);
  });

  cncMachines.forEach((machine, index) => {
    addCuttingMachine(namespace, rootFolder, machine, `CNC${index + 1}`);
  });

  latheMachines.forEach((machine, index) => {
    addCuttingMachine(namespace, rootFolder, machine, `LATHE${index + 1}`);
  });

  let simulationTick = 0;

  const updateInterval = setInterval(() => {
    simulationTick += 1;
    updateBulkNodeSimulation(bulkSimulation.nodes, simulationTick);

    injectionMachines.forEach((machine, index) => {
      machine.simulateCycle();
      updateInjectionVariables(addressSpace, namespace.index, machine, `INJ${index + 1}`);
    });

    allCuttingMachines.forEach((machine) => machine.simulateMovement());
    cncMachines.forEach((machine, index) => {
      updateCuttingVariables(addressSpace, namespace.index, machine, `CNC${index + 1}`);
    });
    latheMachines.forEach((machine, index) => {
      updateCuttingVariables(addressSpace, namespace.index, machine, `LATHE${index + 1}`);
    });
  }, 500);

  return {
    cncMachines,
    latheMachines,
    injectionMachines,
    bulkSimulation,
    updateInterval,
  };
}

function patchNamespaceApi(namespace) {
  const originalAddVariable = namespace.addVariable.bind(namespace);
  namespace.addVariable = function (options) {
    if (options.parentNodeId) {
      options.organizedBy = options.parentNodeId;
      delete options.parentNodeId;
    }
    return originalAddVariable(options);
  };

  const originalAddMethod = namespace.addMethod.bind(namespace);
  namespace.addMethod = function (parent, options) {
    const { func, ...methodOptions } = options;
    const method = originalAddMethod(parent, methodOptions);
    if (typeof func === "function") {
      method.bindMethod(func);
    }
    return method;
  };
}

function addScalar(namespace, parent, prefix, browseName, dataType, getValue, writable = false, setValue) {
  const opcuaType = opcua.DataType[dataType];
  const options = {
    nodeId: `ns=${namespace.index};s=${prefix}_${browseName}`,
    browseName,
    parentNodeId: parent.nodeId,
    dataType,
    minimumSamplingInterval: 500,
    writable,
  };

  if (writable || setValue) {
    options.value = {
      get: () => new opcua.Variant({ dataType: opcuaType, value: getValue() }),
      set: (variant) => {
        setValue(variant.value);
        return opcua.StatusCodes.Good;
      },
    };
  } else {
    options.value = new opcua.Variant({ dataType: opcuaType, value: getValue() });
  }

  return namespace.addVariable(options);
}

function addInjectionMachine(namespace, rootFolder, machine, prefix) {
  const folder = namespace.addFolder(rootFolder, {
    nodeId: `ns=${namespace.index};s=${machine.name}`,
    browseName: machine.name,
  });

  addScalar(namespace, folder, prefix, "Status", "String", () => machine.status);
  addScalar(namespace, folder, prefix, "Power", "Boolean", () => machine.power, true, (value) => machine.setPower(Boolean(value)));
  addScalar(namespace, folder, prefix, "ProductName", "String", () => machine.productName);
  addScalar(namespace, folder, prefix, "MoldName", "String", () => machine.moldName);

  const heatingFolder = namespace.addFolder(folder, {
    nodeId: `ns=${namespace.index};s=${prefix}_HeatingZones`,
    browseName: "HeatingZones",
  });

  machine.heatingZones.forEach((zone) => {
    const zoneFolder = namespace.addFolder(heatingFolder, {
      nodeId: `ns=${namespace.index};s=${prefix}_Zone_${zone.zone}`,
      browseName: `Zone_${zone.zone}`,
    });

    addScalar(namespace, zoneFolder, prefix, `Zone_${zone.zone}_Setpoint`, "Double", () => zone.setpoint, true, (value) =>
      machine.setHeatingZoneSetpoint(zone.zone, Number(value))
    );
    addScalar(namespace, zoneFolder, prefix, `Zone_${zone.zone}_Actual`, "Double", () => zone.actual);
    addScalar(namespace, zoneFolder, prefix, `Zone_${zone.zone}_Enabled`, "Boolean", () => zone.enabled, true, (value) => {
      zone.enabled = Boolean(value);
    });
  });

  const nozzleFolder = namespace.addFolder(folder, {
    nodeId: `ns=${namespace.index};s=${prefix}_Nozzle`,
    browseName: "Nozzle",
  });
  addScalar(namespace, nozzleFolder, prefix, "Nozzle_Setpoint", "Double", () => machine.nozzle.setpoint, true, (value) => {
    machine.nozzle.setpoint = Number(value);
  });
  addScalar(namespace, nozzleFolder, prefix, "Nozzle_Actual", "Double", () => machine.nozzle.actual);

  const injectionUnitFolder = namespace.addFolder(folder, {
    nodeId: `ns=${namespace.index};s=${prefix}_InjectionUnit`,
    browseName: "InjectionUnit",
  });
  addScalar(namespace, injectionUnitFolder, prefix, "InjectionUnit_Pressure", "Double", () => machine.injectionUnit.pressure);
  addScalar(namespace, injectionUnitFolder, prefix, "InjectionUnit_Velocity", "Double", () => machine.injectionUnit.velocity);

  const clampingFolder = namespace.addFolder(folder, {
    nodeId: `ns=${namespace.index};s=${prefix}_Clamping`,
    browseName: "Clamping",
  });
  addScalar(namespace, clampingFolder, prefix, "Clamping_Force", "Double", () => machine.clamping.force);
  addScalar(namespace, clampingFolder, prefix, "Clamping_IsOpen", "Boolean", () => machine.clamping.isOpen);

  const productionFolder = namespace.addFolder(folder, {
    nodeId: `ns=${namespace.index};s=${prefix}_Production`,
    browseName: "Production",
  });
  addScalar(namespace, productionFolder, prefix, "Production_TotalCycles", "UInt32", () => machine.production.totalCycles);
  addScalar(namespace, productionFolder, prefix, "Production_GoodParts", "UInt32", () => machine.production.goodParts);
  addScalar(namespace, productionFolder, prefix, "Production_BadParts", "UInt32", () => machine.production.badParts);
  addScalar(namespace, productionFolder, prefix, "Production_CycleTime", "Double", () => machine.production.cycleTimeAverage);

  addInjectionMethods(namespace, folder, machine, prefix);
}

function addCuttingMachine(namespace, rootFolder, machine, prefix) {
  const folder = namespace.addFolder(rootFolder, {
    nodeId: `ns=${namespace.index};s=${machine.name}`,
    browseName: machine.name,
  });

  addScalar(namespace, folder, prefix, "Status", "UInt32", () => machine.statusCode);
  addScalar(namespace, folder, prefix, "Power", "Boolean", () => machine.power, true, (value) => machine.setPower(Boolean(value)));
  addScalar(namespace, folder, prefix, "MachineType", "String", () => machine.machineType);
  addScalar(namespace, folder, prefix, "ProgramName", "String", () => machine.programName);

  const spindleFolder = namespace.addFolder(folder, {
    nodeId: `ns=${namespace.index};s=${prefix}_Spindle`,
    browseName: "Spindle",
  });
  addScalar(namespace, spindleFolder, prefix, "Spindle_Speed", "Double", () => machine.spindle.speed);
  addScalar(namespace, spindleFolder, prefix, "Spindle_MaxSpeed", "Double", () => machine.spindle.maxSpeed);
  addScalar(namespace, spindleFolder, prefix, "Spindle_Temperature", "Double", () => machine.spindle.temperature);
  addScalar(namespace, spindleFolder, prefix, "Spindle_IsRunning", "Boolean", () => machine.spindle.isRunning);
  addScalar(namespace, spindleFolder, prefix, "Spindle_LoadPercentage", "Double", () => machine.spindle.loadPercentage);

  const axesFolder = namespace.addFolder(folder, {
    nodeId: `ns=${namespace.index};s=${prefix}_Axes`,
    browseName: "Axes",
  });

  ["X", "Y", "Z"].forEach((axis) => {
    const axisNode = addScalar(namespace, axesFolder, prefix, `Axis_${axis}`, "Double", () => machine.axes[axis].position);
    addScalar(namespace, axisNode, prefix, `Axis_${axis}_Position`, "Double", () => machine.axes[axis].position);
    addScalar(namespace, axisNode, prefix, `Axis_${axis}_FeedRate`, "Double", () => machine.axes[axis].feedRate);
  });

  const productionFolder = namespace.addFolder(folder, {
    nodeId: `ns=${namespace.index};s=${prefix}_Production`,
    browseName: "Production",
  });
  addScalar(namespace, productionFolder, prefix, "Production_TotalParts", "UInt32", () => machine.production.totalParts);
  addScalar(namespace, productionFolder, prefix, "Production_GoodParts", "UInt32", () => machine.production.goodParts);
  addScalar(namespace, productionFolder, prefix, "Production_BadParts", "UInt32", () => machine.production.badParts);

  addCuttingMethods(namespace, folder, machine, prefix);
}

function addCuttingMethods(namespace, folder, machine, prefix) {
  const methodsFolder = namespace.addFolder(folder, {
    nodeId: `ns=${namespace.index};s=${prefix}_Methods`,
    browseName: "Methods",
  });

  addSimpleMethod(namespace, methodsFolder, prefix, "StartProgram", () => machine.startProgram());
  addSimpleMethod(namespace, methodsFolder, prefix, "StopProgram", () => machine.stopProgram());
  addSimpleMethod(namespace, methodsFolder, prefix, "EmergencyStop", () => machine.emergencyStop());
  addSimpleMethod(namespace, methodsFolder, prefix, "ResetErrors", () => machine.resetErrors());
  addJsonMethod(namespace, methodsFolder, prefix, "GetFullState", "machineState", () => machine.getFullStateJSON());
  addJsonMethod(namespace, methodsFolder, prefix, "GetProductionReport", "productionData", () => machine.getProductionReport());
  addJsonMethod(namespace, methodsFolder, prefix, "GetErrorLog", "errorLogData", () => machine.getErrorLog());
  addJsonMethod(namespace, methodsFolder, prefix, "GetDiagnostics", "diagnosticsData", () => machine.getDiagnosticsReport());
}

function addInjectionMethods(namespace, folder, machine, prefix) {
  const methodsFolder = namespace.addFolder(folder, {
    nodeId: `ns=${namespace.index};s=${prefix}_Methods`,
    browseName: "Methods",
  });

  addSimpleMethod(namespace, methodsFolder, prefix, "StartProduction", () => machine.startProduction());
  addSimpleMethod(namespace, methodsFolder, prefix, "StopProduction", () => machine.stopProduction());
  addSimpleMethod(namespace, methodsFolder, prefix, "OpenMold", () => machine.openMold());
  addSimpleMethod(namespace, methodsFolder, prefix, "CloseMold", () => machine.closeMold());
  addSimpleMethod(namespace, methodsFolder, prefix, "EmergencyStop", () => machine.emergencyStop());
  addJsonMethod(namespace, methodsFolder, prefix, "GetFullState", "machineState", () => machine.getFullStateJSON());
  addJsonMethod(namespace, methodsFolder, prefix, "GetProductionReport", "productionData", () => machine.getProductionReport());
  addJsonMethod(namespace, methodsFolder, prefix, "GetTemperatureReport", "temperatureData", () => machine.getTemperatureReport());
  addJsonMethod(namespace, methodsFolder, prefix, "GetAlarmLog", "alarmLogData", () => machine.getAlarmLog());
  addJsonMethod(namespace, methodsFolder, prefix, "GetDiagnostics", "diagnosticsData", () => machine.getDiagnosticsReport());
}

function addSimpleMethod(namespace, methodsFolder, prefix, browseName, action) {
  namespace.addMethod(methodsFolder, {
    nodeId: `ns=${namespace.index};s=${prefix}_${browseName}`,
    browseName,
    executable: true,
    userExecutable: true,
    func: (inputArguments, context, callback) => {
      action();
      callback(null, { statusCode: opcua.StatusCodes.Good });
    },
  });
}

function addJsonMethod(namespace, methodsFolder, prefix, browseName, outputName, getJson) {
  namespace.addMethod(methodsFolder, {
    nodeId: `ns=${namespace.index};s=${prefix}_${browseName}`,
    browseName,
    outputArguments: [
      {
        name: outputName,
        description: `${browseName} JSON`,
        dataType: opcua.DataType.String,
        valueRank: -1,
      },
    ],
    executable: true,
    userExecutable: true,
    func: (inputArguments, context, callback) => {
      callback(null, {
        outputArguments: [new opcua.Variant({ dataType: opcua.DataType.String, value: getJson() })],
        statusCode: opcua.StatusCodes.Good,
      });
    },
  });
}

function updateInjectionVariables(addressSpace, namespaceIndex, machine, prefix) {
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Status`, machine.status);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Power`, machine.power);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_ProductName`, machine.productName);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_MoldName`, machine.moldName);

  machine.heatingZones.forEach((zone) => {
    updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Zone_${zone.zone}_Actual`, zone.actual);
    updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Zone_${zone.zone}_Enabled`, zone.enabled);
  });

  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Nozzle_Actual`, machine.nozzle.actual);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_InjectionUnit_Pressure`, machine.injectionUnit.pressure);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_InjectionUnit_Velocity`, machine.injectionUnit.velocity);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Clamping_Force`, machine.clamping.force);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Clamping_IsOpen`, machine.clamping.isOpen);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Production_TotalCycles`, machine.production.totalCycles);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Production_GoodParts`, machine.production.goodParts);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Production_BadParts`, machine.production.badParts);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Production_CycleTime`, machine.production.cycleTimeAverage);
}

function updateCuttingVariables(addressSpace, namespaceIndex, machine, prefix) {
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Status`, machine.statusCode);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Power`, machine.power);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_ProgramName`, machine.programName);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Spindle_Speed`, machine.spindle.speed);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Spindle_Temperature`, machine.spindle.temperature);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Spindle_IsRunning`, machine.spindle.isRunning);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Spindle_LoadPercentage`, machine.spindle.loadPercentage);

  ["X", "Y", "Z"].forEach((axis) => {
    updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Axis_${axis}`, machine.axes[axis].position);
    updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Axis_${axis}_Position`, machine.axes[axis].position);
    updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Axis_${axis}_FeedRate`, machine.axes[axis].feedRate);
  });

  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Production_TotalParts`, machine.production.totalParts);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Production_GoodParts`, machine.production.goodParts);
  updateVariableValue(addressSpace, `ns=${namespaceIndex};s=${prefix}_Production_BadParts`, machine.production.badParts);
}

function createBulkNodeSimulation(namespace, rootFolder) {
  const bulkFolder = namespace.addFolder(rootFolder, {
    nodeId: `ns=${namespace.index};s=Bulk_1000_Nodes`,
    browseName: "Bulk_1000_Nodes",
  });

  const nodes = [];

  for (let i = 1; i <= BULK_NODE_COUNT; i++) {
    const nodeName = `Node_${String(i).padStart(4, "0")}`;
    const initialValue = Number((50 + Math.sin(i / 15) * 20).toFixed(3));
    const variable = namespace.addVariable({
      nodeId: `ns=${namespace.index};s=Bulk_${nodeName}`,
      browseName: nodeName,
      parentNodeId: bulkFolder.nodeId,
      dataType: "Double",
      minimumSamplingInterval: 500,
      value: new opcua.Variant({
        dataType: opcua.DataType.Double,
        value: initialValue,
      }),
      writable: false,
    });

    nodes.push({
      variable,
      baseValue: initialValue,
      phase: i / 25,
    });
  }

  return {
    folder: bulkFolder,
    nodes,
  };
}

function updateBulkNodeSimulation(nodes, tick) {
  nodes.forEach((node, index) => {
    const drift = Math.sin(tick / 8 + node.phase) * 5;
    const ripple = Math.cos(tick / 17 + index / 50) * 1.5;
    const value = Number((node.baseValue + drift + ripple).toFixed(3));

    node.variable.setValueFromSource(
      new opcua.Variant({
        dataType: opcua.DataType.Double,
        value,
      })
    );
  });
}

function resolveDataType(variable, value) {
  if (variable && variable.dataType) {
    const dataType = variable.dataType.value ?? variable.dataType;
    if (typeof dataType === "number") {
      return dataType;
    }
    if (typeof dataType === "string" && opcua.DataType[dataType] !== undefined) {
      return opcua.DataType[dataType];
    }
  }

  switch (typeof value) {
    case "string":
      return opcua.DataType.String;
    case "boolean":
      return opcua.DataType.Boolean;
    case "number":
      return Number.isInteger(value) ? opcua.DataType.UInt32 : opcua.DataType.Double;
    default:
      return opcua.DataType.Variant;
  }
}

function updateVariableValue(addressSpace, nodeId, value) {
  const variable = addressSpace.findNode(nodeId);
  if (variable) {
    variable.setValueFromSource(
      new opcua.Variant({
        dataType: resolveDataType(variable, value),
        value,
      })
    );
  }
}

module.exports = {
  setupNamespace,
  getCNCMachine: () => cncMachines[0],
  getCNCMachines: () => cncMachines,
  getLatheMachines: () => latheMachines,
  getInjectionMachine: () => injectionMachines[0],
  getInjectionMachines: () => injectionMachines,
};
