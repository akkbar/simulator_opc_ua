# OPC UA Machine Simulator

Simulasi OPC UA Server dengan machine dummy data yang real-time. Project ini mensimulasikan dua jenis mesin manufaktur:
1. **CNC Machine** - Mesin CNC dengan spindle, axes, dan production tracking
2. **Injection Molding Machine** - Mesin injection sesuai standar Euromap 77

## Features

### CNC Machine
- **Spindle Control**: Speed, temperature, load monitoring
- **Axes**: 3-axis movement (X, Y, Z) dengan position dan feed rate tracking
- **Tools**: Tool offset management
- **Production**: Part counting, good/bad parts tracking
- **Methods**: StartProgram, StopProgram, EmergencyStop, ResetErrors

### Injection Molding Machine (Euromap 77)
- **Heating Zones**: 5 heating zones dengan setpoint dan actual temperature
- **Nozzle**: Temperature control untuk nozzle
- **Injection Unit**: Pressure dan velocity monitoring
- **Clamping**: Force dan position tracking
- **Mold**: Temperature dan opening position control
- **Production**: Cycle counting, parts quality tracking
- **Methods**: StartProduction, StopProduction, OpenMold, CloseMold, EmergencyStop

## Project Structure

```
simulator/
├── index.js                    # Entry point
├── package.json               # Dependencies
├── models/
│   ├── cncMachine.js         # CNC Machine model dengan logic
│   └── injectionMachine.js   # Injection Machine model (Euromap 77)
└── opcua/
    ├── server.js              # OPC UA Server setup
    └── namespace.js           # Tag tree dan methods definition
```

## Installation

```bash
cd simulator
npm install
```

## Usage

### Start Server

```bash
npm start
```

Server akan berjalan di:
```
opc.tcp://localhost:4334/opcua
```

### Development (dengan auto-reload)

```bash
npm install -g nodemon
npm run dev
```

## OPC UA Tag Tree Structure

### Minimum trial tags

Node IDs use machine prefixes: `CNC1`-`CNC5`, `LATHE1`-`LATHE5`, and `INJ1`-`INJ5`.

**CNC Milling**
- `CNC1_Feedrate`
- `CNC1_Spindle_Speed`
- `CNC1_Spindle_Temperature`
- `CNC1_Spindle_LoadPercentage`
- `CNC1_Axis_X_LoadPercentage`
- `CNC1_Axis_Y_LoadPercentage`
- `CNC1_Axis_Z_LoadPercentage`
- `CNC1_FeedrateOverride`

**CNC Lathe**
- `LATHE1_Feedrate`
- `LATHE1_Spindle_Speed`
- `LATHE1_Spindle_Temperature`
- `LATHE1_Spindle_LoadPercentage`
- `LATHE1_Axis_X_LoadPercentage`
- `LATHE1_Axis_Z_LoadPercentage`
- `LATHE1_FeedrateOverride`

**Injection**
- `INJ1_MoldName`
- `INJ1_Clamping_Force`
- `INJ1_InjectionUnit_Cushion`
- `INJ1_BarrelTemp_Zone_1` through `INJ1_BarrelTemp_Zone_4`
- `INJ1_Nozzle_Actual`
- `INJ1_Production_LastCycleTime`

### CNC Machine

```
Objects/
└── CNC_Machine
    ├── Status                    (String)
    ├── Power                     (Boolean) - Writable
    ├── Spindle
    │   ├── Speed                 (Double)
    │   ├── MaxSpeed              (Double)
    │   ├── Temperature           (Double)
    │   ├── IsRunning             (Boolean)
    │   └── LoadPercentage        (Double)
    ├── Axes
    │   ├── X
    │   │   ├── Position          (Double)
    │   │   └── FeedRate          (Double)
    │   ├── Y
    │   │   ├── Position          (Double)
    │   │   └── FeedRate          (Double)
    │   └── Z
    │       ├── Position          (Double)
    │       └── FeedRate          (Double)
    ├── Production
    │   ├── TotalParts            (UInt32)
    │   ├── GoodParts             (UInt32)
    │   └── BadParts              (UInt32)
    └── Methods
        ├── StartProgram()
        ├── StopProgram()
        ├── EmergencyStop()
        ├── ResetErrors()
        ├── GetFullState() → JSON (complete machine state)
        ├── GetProductionReport() → JSON (production stats)
        ├── GetErrorLog() → JSON (error and warning history)
        └── GetDiagnostics() → JSON (detailed diagnostics)
```

Catatan UaExpert: node `CNC_Machine/Axes/X`, `Y`, dan `Z` sekarang adalah variable `Double`
yang berisi current position axis. Child `Position` dan `FeedRate` tetap tersedia untuk
client yang memakai struktur lama.

### Injection Molding Machine

```
Objects/
└── Injection_Machine
    ├── Status                    (String)
    ├── Power                     (Boolean) - Writable
    ├── HeatingZones
    │   ├── Zone_1
    │   │   ├── Setpoint          (Double) - Writable
    │   │   ├── Actual            (Double)
    │   │   └── Enabled           (Boolean) - Writable
    │   ├── Zone_2, Zone_3, ...
    │   │   └── [same structure as Zone_1]
    ├── Nozzle
    │   ├── Setpoint              (Double) - Writable
    │   └── Actual                (Double)
    ├── InjectionUnit
    │   ├── Pressure              (Double)
    │   └── Velocity              (Double)
    ├── Clamping
    │   ├── Force                 (Double)
    │   └── IsOpen                (Boolean)
    ├── Production
    │   ├── TotalCycles           (UInt32)
    │   ├── GoodParts             (UInt32)
    │   ├── BadParts              (UInt32)
    │   └── CycleTime             (Double)
    └── Methods
        ├── StartProduction()
        ├── StopProduction()
        ├── OpenMold()
        ├── CloseMold()
        ├── EmergencyStop()
        ├── GetFullState() → JSON (complete machine state)
        ├── GetProductionReport() → JSON (production stats)
        ├── GetTemperatureReport() → JSON (all heating zones)
        ├── GetAlarmLog() → JSON (alarm and warning history)
        └── GetDiagnostics() → JSON (detailed diagnostics)
```

### Bulk 1000 Nodes

```
Objects/
└── Bulk_1000_Nodes
    ├── Node_0001                (Double)
    ├── Node_0002                (Double)
    ├── ...
    └── Node_1000                (Double)
```

Node ID:
- Folder: `ns=<simulator_namespace_index>;s=Bulk_1000_Nodes`
- Variables: `ns=<simulator_namespace_index>;s=Bulk_Node_0001` sampai `Bulk_Node_1000`

Nilai semua node di folder ini disimulasikan dan di-update setiap 500ms.

## How It Works

### Data Simulation

Data di-update setiap 500ms secara otomatis:

1. **CNC Machine**
   - Simulasi gerakan axis dengan random position
   - Feed rate update sesuai movement
   - Spindle speed dan temperature tracking saat running
   - Production counter increment

2. **Injection Machine**
   - Simulasi siklus injection (injection phase → holding → cooling → end cycle)
   - Temperature ramp-up untuk heating zones
   - Pressure dan velocity update sesuai cycle phase
   - Cycle time tracking dan production stats

### Methods

Semua methods dapat di-call melalui OPC UA client:

#### Control Methods (No return value)
```
// CNC Example
CNC_Machine/Methods/StartProgram()
CNC_Machine/Methods/EmergencyStop()

// Injection Example
Injection_Machine/Methods/StartProduction()
Injection_Machine/Methods/OpenMold()
```

#### Data Retrieval Methods (Return JSON)
Data yang **hanya bisa di-read melalui method call** (tidak tersedia sebagai variables):

**CNC Machine:**
```
CNC_Machine/Methods/GetFullState() 
  → Return: { name, status, power, spindle, axes, production, errors, warnings }

CNC_Machine/Methods/GetProductionReport()
  → Return: { totalProduced, goodParts, badParts, efficiency }

CNC_Machine/Methods/GetErrorLog()
  → Return: { errorCount, warningCount, errors[], warnings[] }

CNC_Machine/Methods/GetDiagnostics()
  → Return: { status, spindle, axes, temperatures, speeds }
```

**Injection Machine:**
```
Injection_Machine/Methods/GetFullState()
  → Return: { name, status, heatingZones, nozzle, clamping, production }

Injection_Machine/Methods/GetProductionReport()
  → Return: { totalCycles, goodParts, badParts, efficiency, averageCycleTime }

Injection_Machine/Methods/GetTemperatureReport()
  → Return: { heatingZones[], nozzle, mold (dengan actual & setpoint) }

Injection_Machine/Methods/GetAlarmLog()
  → Return: { alarmCount, warningCount, alarms[], warnings[] }

Injection_Machine/Methods/GetDiagnostics()
  → Return: { cycles, pressure, force, temperatures, speeds }
```

Lihat `examples/dataRetrievalMethods.js` untuk demonstrasi lengkap.

## Testing dengan OPC UA Client

### Menggunakan kepada Browser OPC UA (contoh: UaExpert)

1. Create New Server:
   - URL: `opc.tcp://localhost:4334/opcua`
   - Click "Connect"

2. Browse Tags:
   - Expand Objects
   - Lihat CNC_Machine dan Injection_Machine
   - Monitor real-time value updates

3. Call Methods:
   - Right-click pada method
   - Pilih "Call"
   - Method akan execute

## Modifying Machine Parameters

### Edit CNC Machine Specs

File: `models/cncMachine.js`

```javascript
this.spindle = {
  speed: 0,
  maxSpeed: 24000,        // Change max spindle speed
  temperature: 25,
  maxTemperature: 80,     // Change max temperature
  loadPercentage: 0,
};
```

### Edit Injection Machine Specs

File: `models/injectionMachine.js`

```javascript
this.heatingZones = [
  { zone: 1, setpoint: 200, actual: 25, enabled: false },
  // Modify setpoint atau tambah zones
];
```

## Add Custom Tags

Edit `opcua/namespace.js` - Section "CNC MACHINE TAGS" atau "INJECTION MACHINE TAGS":

```javascript
addressSpace.addVariable({
  nodeId: `ns=${namespace};s=Custom_Tag_Name`,
  browseName: "CustomTagName",
  parentNodeId: cncFolder.nodeId,
  dataType: "Double",
  value: new opcua.Variant({
    dataType: opcua.DataType.Double,
    value: 0,
  }),
  writable: true,  // atau false untuk read-only
});
```

## Add Custom Methods

Edit `opcua/namespace.js` - Section "METHODS":

```javascript
addressSpace.addMethod(cncMethodsFolder, {
  nodeId: `ns=${namespace};s=Custom_Method`,
  browseName: "CustomMethod",
  executable: true,
  userExecutable: true,
  func: function (inputArguments, context, callback) {
    // Your custom logic here
    cncMachine.customFunction();
    callback(null, {
      statusCode: opcua.StatusCodes.Good,
    });
  },
});
```

## Dependencies

- **node-opcua**: OPC UA Server library
- **nodemon**: Auto-reload development tool

## Troubleshooting

### Port Already in Use

Jika port 4334 sudah terpakai, edit `opcua/server.js`:

```javascript
const server = new opcua.OPCUAServer({
  port: 4335,  // Change port number
  ...
});
```

### Connection Refused

Pastikan server sudah running:
```bash
npm start
```

Monitor console output untuk confirmation.

## Performance Notes

- Update interval: 500ms per simulasi cycle
- Cocok untuk development dan testing
- Untuk production use case, adjust update interval sesuai kebutuhan

## Future Enhancements

- [ ] Add more heating zones untuk injection machine
- [ ] Add pressure monitoring untuk CNC
- [ ] Add vibration sensor simulation
- [ ] Add error/alarm history logging
- [ ] Web dashboard untuk monitoring
- [ ] Integration dengan InfluxDB untuk data persistence

## License

ISC

## Author

Rubixis IoT Simulator
