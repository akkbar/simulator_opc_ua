# Development Guide - OPC UA Simulator

Panduan lengkap untuk mengembangkan dan extend OPC UA Simulator.

## Arsitektur Overview

```
┌─────────────────────────────────────────────────────────┐
│                    OPC UA Server                        │
│              (opcua/server.js)                          │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────────┐        ┌──────▼───────────┐
│  Namespace Setup   │        │   Models         │
│ (opcua/namespace)  │        │ (models/)        │
│                    │        │                  │
│ • CNC_Machine      │◄──┤    │ • cncMachine.js │
│ • Injection_Mach.  │    ├───│ • injectionMachine
│ • Methods          │    │   │   Machine.js   │
│ • Data Binding     │    │   │                 │
│ • Simulation Loop  │◄──┘    │                 │
└────────────────────┘        └──────────────────┘
```

## File Structure Explanation

### `models/cncMachine.js`
Machine logic layer. Mengandung:
- Properties: spindle, axes, tool, production, etc.
- Methods: simulateMovement(), startProgram(), stopProgram(), etc.
- Helper functions: getRandomValue(), getState()

**Key Methods:**
- `simulateMovement()` - Update posisi axis, speed, temperature
- `startProgram()` - Set status RUNNING
- `stopProgram()` - Graceful shutdown
- `emergencyStop()` - Immediate stop dengan error
- `getState()` - Return current state object

### `models/injectionMachine.js`
Similiar dengan CNC tapi untuk injection molding (Euromap 77).

**Lifecycle:**
```
IDLE → (StartProduction) → RUNNING
         (simulateCycle)
         - Injection Phase (0-2s)
         - Holding Phase (2-4s)  
         - Cooling Phase (4-5s)
         - End Cycle
         
       → (StopProduction) → IDLE
```

### `opcua/server.js`
OPC UA Server entry point.
- Port configuration
- Server lifecycle management
- Client session handling
- Graceful shutdown

### `opcua/namespace.js`
Tag structure dan data binding.

**Sections:**
1. Folder structure
2. Variable definitions (CNC)
3. Variable definitions (Injection)
4. Methods definitions
5. Simulation loop (update interval)

## Adding New Machine

### Step 1: Create Model File

```javascript
// models/robotArm.js
class RobotArm {
  constructor() {
    this.name = "Robot_Arm_001";
    this.status = "IDLE";
    this.joints = {
      J1: { position: 0, minPos: -170, maxPos: 170 },
      J2: { position: 0, minPos: -85, maxPos: 85 },
      J3: { position: 0, minPos: -155, maxPos: 155 },
      // ... more joints
    };
  }
  
  simulateMovement() {
    // Your simulation logic
  }
  
  moveToPosition(j1, j2, j3) {
    // Implementation
  }
}

module.exports = RobotArm;
```

### Step 2: Register in Namespace

Di `opcua/namespace.js`, import model:

```javascript
const RobotArm = require("../models/robotArm");
let robotArm = new RobotArm();
```

### Step 3: Add Folder Structure

```javascript
const robotFolder = addressSpace.addFolder(rootFolder, {
  nodeId: `ns=${namespace};s=Robot_Arm`,
  browseName: "Robot_Arm",
});
```

### Step 4: Add Tags

```javascript
addressSpace.addVariable({
  nodeId: `ns=${namespace};s=Robot_Status`,
  browseName: "Status",
  parentNodeId: robotFolder.nodeId,
  dataType: "String",
  value: new opcua.Variant({
    dataType: opcua.DataType.String,
    value: robotArm.status,
  }),
  writable: false,
});

// For each joint
["J1", "J2", "J3"].forEach((joint) => {
  addressSpace.addVariable({
    nodeId: `ns=${namespace};s=Robot_${joint}_Position`,
    browseName: "Position",
    parentNodeId: robotFolder.nodeId,
    dataType: "Double",
    value: new opcua.Variant({
      dataType: opcua.DataType.Double,
      value: robotArm.joints[joint].position,
    }),
    writable: false,
  });
});
```

### Step 5: Add Methods

```javascript
const robotMethodsFolder = addressSpace.addFolder(robotFolder, {
  nodeId: `ns=${namespace};s=Robot_Methods`,
  browseName: "Methods",
});

addressSpace.addMethod(robotMethodsFolder, {
  nodeId: `ns=${namespace};s=Robot_MoveToHome`,
  browseName: "MoveToHome",
  executable: true,
  userExecutable: true,
  func: function (inputArguments, context, callback) {
    robotArm.moveToHome();
    callback(null, {
      statusCode: opcua.StatusCodes.Good,
    });
  },
});
```

### Step 6: Add to Simulation Loop

In the `setInterval()` block dalam namespace.js:

```javascript
const updateInterval = setInterval(() => {
  // ... existing updates ...
  
  // Update Robot
  robotArm.simulateMovement();
  updateVariableValue(
    addressSpace,
    `ns=${namespace};s=Robot_Status`,
    robotArm.status
  );
  updateVariableValue(
    addressSpace,
    `ns=${namespace};s=Robot_J1_Position`,
    robotArm.joints.J1.position
  );
}, 500);
```

## Adding New Tags/Variables

### Read-Only Variable (Sensor)

```javascript
addressSpace.addVariable({
  nodeId: `ns=${namespace};s=CNC_Vibration`,
  browseName: "Vibration",
  parentNodeId: cncFolder.nodeId,
  dataType: "Double",
  value: new opcua.Variant({
    dataType: opcua.DataType.Double,
    value: 0.0,
  }),
  writable: false,  // ← Read-only
});
```

### Writable Variable (Parameter)

```javascript
addressSpace.addVariable({
  nodeId: `ns=${namespace};s=CNC_SpindleSetpoint`,
  browseName: "SpindleSetpoint",
  parentNodeId: spindleFolder.nodeId,
  dataType: "Double",
  value: new opcua.Variant({
    dataType: opcua.DataType.Double,
    value: 5000,
  }),
  writable: true,  // ← Writable
});
```

### String Enum (Status)

```javascript
addressSpace.addVariable({
  nodeId: `ns=${namespace};s=CNC_Mode`,
  browseName: "Mode",
  parentNodeId: cncFolder.nodeId,
  dataType: "String",
  value: new opcua.Variant({
    dataType: opcua.DataType.String,
    value: "MDI",  // MDI, AUTO, JOG, etc.
  }),
  writable: true,
});
```

## Adding Methods with Parameters

### Method dengan Input Parameters

```javascript
addressSpace.addMethod(cncMethodsFolder, {
  nodeId: `ns=${namespace};s=CNC_SetSpindleSpeed`,
  browseName: "SetSpindleSpeed",
  inputArguments: [
    {
      name: "targetSpeed",
      description: "Target spindle speed in RPM",
      dataType: opcua.DataType.Double,
      valueRank: -1,
    },
  ],
  outputArguments: [
    {
      name: "success",
      description: "Whether operation was successful",
      dataType: opcua.DataType.Boolean,
      valueRank: -1,
    },
  ],
  executable: true,
  userExecutable: true,
  func: function (inputArguments, context, callback) {
    const targetSpeed = inputArguments[0].value;
    
    try {
      cncMachine.setSpindleSpeed(targetSpeed);
      callback(null, {
        outputArguments: [
          new opcua.Variant({
            dataType: opcua.DataType.Boolean,
            value: true,
          }),
        ],
        statusCode: opcua.StatusCodes.Good,
      });
    } catch (err) {
      callback(null, {
        outputArguments: [
          new opcua.Variant({
            dataType: opcua.DataType.Boolean,
            value: false,
          }),
        ],
        statusCode: opcua.StatusCodes.BadInvalidArgument,
      });
    }
  },
});
```

## Common Patterns

### Pattern 1: Temperature Control Loop

```javascript
// In model
updateTemperature() {
  const diff = this.setpoint - this.actual;
  if (Math.abs(diff) > 0.1) {
    this.actual += diff * 0.05; // Smooth ramp-up
  }
}

// In namespace
updateVariableValue(
  addressSpace,
  `ns=${namespace};s=Zone_Actual`,
  zone.actual
);
```

### Pattern 2: State Machine

```javascript
// In model
startCycle() {
  this.state = "RUNNING";
  this.cycleStartTime = Date.now();
}

simulate() {
  const elapsed = Date.now() - this.cycleStartTime;
  
  if (elapsed < 2000) {
    this.subState = "INJECTION";
  } else if (elapsed < 4000) {
    this.subState = "HOLDING";
  } else {
    this.state = "IDLE";
  }
}
```

### Pattern 3: Counter/Statistics

```javascript
// In model
incrementCount() {
  this.totalCycles++;
  this.cycleTimeArray.push(cycleDuration);
  this.averageCycleTime = 
    this.cycleTimeArray.reduce((a, b) => a + b) / 
    this.cycleTimeArray.length;
}
```

## Testing Your Changes

### 1. Unit Test

```javascript
// test/cncMachine.test.js
const CNCMachine = require("../models/cncMachine");

const machine = new CNCMachine();
console.assert(machine.status === "IDLE", "Initial status should be IDLE");

machine.setPower(true);
machine.startProgram();
console.assert(machine.status === "RUNNING", "Should be RUNNING");
console.assert(machine.spindle.isRunning === true, "Spindle should run");

console.log("✓ All tests passed");
```

### 2. Integration Test

Run `test/quickTest.js` untuk verify server & methods:
```bash
npm start    # Terminal 1
npm test     # Terminal 2
```

### 3. Client Test

Gunakan `examples/clientExample.js` untuk full cycle testing

## Performance Optimization

### Reduce Update Frequency

```javascript
// Hanya update high-priority tags
const updateInterval = setInterval(() => {
  // Always update
  updateVariableValue(...critical_tags);
  
  if (updateCount % 2 === 0) {
    // Every 2 cycles
    updateVariableValue(...normal_tags);
  }
  
  if (updateCount % 10 === 0) {
    // Every 10 cycles
    updateVariableValue(...low_priority_tags);
  }
}, 500);
```

### Batch Updates

```javascript
const updates = [
  { nodeId: "...", value: val1 },
  { nodeId: "...", value: val2 },
  // ...
];

updates.forEach(u => 
  updateVariableValue(addressSpace, u.nodeId, u.value)
);
```

## Debugging

### Enable Logging

```javascript
// In namespace.js
const DEBUG = process.env.DEBUG === "true";

if (DEBUG) {
  console.log(`CNC Updated: ${cncMachine.spindle.speed} RPM`);
}
```

Run with:
```bash
DEBUG=true npm start
```

### Monitor Server Health

```bash
# Check if server is responsive
node test/quickTest.js

# Monitor active connections
# Add to server.js:
setInterval(() => {
  console.log(`Active sessions: ${server.sessions.length}`);
}, 10000);
```

## Best Practices

1. **Separation of Concerns**
   - Models: Business logic only
   - Namespace: OPC UA binding only
   - Server: Lifecycle only

2. **Error Handling**
   - Always wrap try-catch di methods
   - Return appropriate status codes
   - Log errors untuk debugging

3. **Performance**
   - Avoid heavy computation dalam simulation loop
   - Use appropriate data types
   - Clean up resources properly

4. **Documentation**
   - Comment complex logic
   - Keep README updated
   - Use meaningful variable names

5. **Testing**
   - Test models independently
   - Test methods return correct status
   - Verify data types match OPC UA spec
