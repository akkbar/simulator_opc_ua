/**
 * Injection Molding Machine Simulator - Euromap 77 Standard
 * Simulasi mesin injection dengan parameter sesuai standar Euromap 77
 */
class InjectionMachine {
  constructor(options = {}) {
    this.name = options.name || "Injection_Machine_001";
    this.statusMap = {
      Running: 1,
      Emergency: 2,
      Down: 3,
      Setup: 4,
      Idle: 5,
      Paused: 6,
      Disconnected: 7,
    };
    this.statuses = Object.keys(this.statusMap);
    this.statusName = "Idle";
    this.statusCode = this.statusMap[this.statusName];
    this.power = options.autoStart ?? false;
    this.statusChangeIntervalMs = options.statusChangeIntervalMs || 5 * 60 * 1000;
    this.nextStatusChangeAt = Date.now() + this.statusChangeIntervalMs;
    this.products = options.products || [
      { productName: "Housing Cover A", moldName: "MOLD-HCA-01" },
      { productName: "Sensor Bracket B", moldName: "MOLD-SBB-02" },
      { productName: "Valve Cap C", moldName: "MOLD-VCC-03" },
      { productName: "Connector Body D", moldName: "MOLD-CBD-04" },
      { productName: "Gear Case E", moldName: "MOLD-GCE-05" },
    ];
    this.productIndex = options.productIndex || 0;
    this.productName = this.products[this.productIndex].productName;
    this.moldName = this.products[this.productIndex].moldName;
    this.productChangeIntervalMs = options.productChangeIntervalMs || 3 * 60 * 60 * 1000;
    this.nextProductChangeAt = Date.now() + this.productChangeIntervalMs;
    this.partCountIntervalMs = this.getRandomValue(60_000, 80_000);
    this.nextPartCountAt = Date.now() + this.partCountIntervalMs;

    // Euromap 77 - Machine Status
    this.machineStatus = {
      operatingMode: "Auto", // Auto, Manual, Service
      cycleCount: 0,
      cycleTime: this.partCountIntervalMs / 1000,
      lastCycleTime: this.partCountIntervalMs / 1000,
    };

    // Heating zones (Euromap 77 standard - up to 10 zones)
    this.heatingZones = [
      { zone: 1, setpoint: 200, actual: 25, enabled: false },
      { zone: 2, setpoint: 210, actual: 25, enabled: false },
      { zone: 3, setpoint: 220, actual: 25, enabled: false },
      { zone: 4, setpoint: 225, actual: 25, enabled: false },
      { zone: 5, setpoint: 230, actual: 25, enabled: false },
    ];

    // Nozzle
    this.nozzle = {
      setpoint: 230,
      actual: 25,
      enabled: false,
    };

    // Mold
    this.mold = {
      setpoint: 60,
      actual: 25,
      enabled: false,
      openPosition: 0, // 0-100%
    };

    // Injection unit
    this.injectionUnit = {
      velocity: 0, // mm/s
      pressure: 0, // bar
      position: 0, // mm
      cushion: 0, // mm
      maxPressure: 2000,
      maxVelocity: 500,
    };

    // Hydraulic / Clamping
    this.clamping = {
      force: 0, // tons
      maxForce: 500,
      position: 0, // 0-100%
      isOpen: true,
    };

    // Screw
    this.screw = {
      speed: 0, // RPM
      maxSpeed: 200,
      torque: 0, // Nm
      position: 0, // mm
      temperature: 25,
    };

    // Production
    this.production = {
      totalCycles: 0,
      goodParts: 0,
      badParts: 0,
      totalWeight: 0, // kg
      cycleTimeAverage: 0,
    };

    // Alarms
    this.alarms = [];
    this.warnings = [];

    if (this.power) {
      this.setStatus("Running");
      this.heatingZones.forEach((zone) => (zone.enabled = true));
      this.nozzle.enabled = true;
      this.mold.enabled = true;
    }
  }

  /**
   * Simulasi siklus injection
   */
  simulateCycle() {
    const now = Date.now();
    this.rotateStatusIfNeeded(now);
    this.rotateProductIfNeeded(now);

    if (!this.power || this.statusName !== "Running") {
      this.injectionUnit.pressure = 0;
      this.injectionUnit.velocity = 0;
      this.clamping.force = 0;
      this.updateTemperatures();
      return;
    }

    this.machineStatus.cycleTime = Math.max(0, (this.nextPartCountAt - now) / 1000);

    // Simulasi injection
    const elapsed = this.partCountIntervalMs - (this.nextPartCountAt - now);
    const progress = Math.max(0, Math.min(1, elapsed / this.partCountIntervalMs));
    if (progress < 0.35) {
      // Injection phase
      this.injectionUnit.pressure = this.getRandomValue(500, 1800);
      this.injectionUnit.velocity = this.getRandomValue(50, 200);
      this.injectionUnit.position = progress * 100;
      this.injectionUnit.cushion = this.getRandomValue(2, 8);
      this.clamping.isOpen = false;
      this.clamping.position = 0;
      this.mold.openPosition = 0;
    } else if (progress < 0.75) {
      // Holding phase
      this.injectionUnit.pressure = this.getRandomValue(100, 300);
      this.injectionUnit.velocity = 0;
      this.injectionUnit.cushion = this.getRandomValue(3, 9);
    } else if (progress < 1) {
      // Cooling phase
      this.injectionUnit.pressure = 0;
      this.injectionUnit.velocity = 0;
      this.injectionUnit.cushion = this.getRandomValue(3, 9);
    } else {
      // End of cycle
      this.incrementPartCount(now);
    }

    // Update temperatures
    this.updateTemperatures();

    // Update hydraulic pressure
    this.clamping.force = this.getRandomValue(100, 450);
  }

  /**
   * Update heating zones
   */
  updateTemperatures() {
    // Zones heating up/down
    this.heatingZones.forEach((zone) => {
      if (zone.enabled) {
        const diff = zone.setpoint - zone.actual;
        if (Math.abs(diff) > 3) {
          zone.actual += diff * 0.03 + this.getRandomValue(-0.4, 0.4);
        } else {
          zone.actual = zone.setpoint + this.getRandomValue(-1.5, 1.5);
        }
      } else {
        zone.actual = Math.max(zone.actual - this.getRandomValue(0.1, 0.5), 25);
      }
    });

    // Nozzle
    if (this.nozzle.enabled) {
      const diff = this.nozzle.setpoint - this.nozzle.actual;
      if (Math.abs(diff) > 3) {
        this.nozzle.actual += diff * 0.03 + this.getRandomValue(-0.4, 0.4);
      } else {
        this.nozzle.actual = this.nozzle.setpoint + this.getRandomValue(-1.5, 1.5);
      }
    } else {
      this.nozzle.actual = Math.max(this.nozzle.actual - this.getRandomValue(0.1, 0.5), 25);
    }

    // Mold
    if (this.mold.enabled) {
      const diff = this.mold.setpoint - this.mold.actual;
      if (Math.abs(diff) > 2) {
        this.mold.actual += diff * 0.02;
      } else {
        this.mold.actual = this.mold.setpoint + this.getRandomValue(-0.5, 0.5);
      }
    } else {
      this.mold.actual = Math.max(this.mold.actual - this.getRandomValue(0.05, 0.2), 25);
    }

    // Screw
    this.screw.temperature = this.getRandomValue(200, 230);
  }

  /**
   * Start production
   */
  startProduction() {
    if (this.power && this.statusName !== "Running") {
      // Enable all heating zones
      this.heatingZones.forEach((zone) => (zone.enabled = true));
      this.nozzle.enabled = true;
      this.mold.enabled = true;
      this.setStatus("Running");
    }
  }

  /**
   * Stop production
   */
  stopProduction() {
    this.setStatus("Idle");
    this.heatingZones.forEach((zone) => (zone.enabled = false));
    this.nozzle.enabled = false;
    this.mold.enabled = false;
  }

  /**
   * Power ON/OFF
   */
  setPower(value) {
    this.power = value;
    if (value && this.statusName !== "Running") {
      this.startProduction();
    } else if (!value) {
      this.stopProduction();
      this.injectionUnit.pressure = 0;
      this.injectionUnit.velocity = 0;
      this.clamping.force = 0;
    }
  }

  rotateStatusIfNeeded(now) {
    if (now < this.nextStatusChangeAt) return;

    this.setStatus(this.statuses[Math.floor(Math.random() * this.statuses.length)]);
    this.nextStatusChangeAt = now + this.statusChangeIntervalMs;
  }

  setStatus(statusName) {
    this.statusName = statusName;
    this.statusCode = this.statusMap[statusName];
  }

  rotateProductIfNeeded(now) {
    if (now < this.nextProductChangeAt) return;

    this.productIndex = (this.productIndex + 1) % this.products.length;
    this.productName = this.products[this.productIndex].productName;
    this.moldName = this.products[this.productIndex].moldName;
    this.nextProductChangeAt = now + this.productChangeIntervalMs;
  }

  incrementPartCount(now) {
    this.machineStatus.cycleCount++;
    this.machineStatus.lastCycleTime = this.partCountIntervalMs / 1000;
    this.production.totalCycles++;

    if (Math.random() > 0.05) {
      this.production.goodParts++;
    } else {
      this.production.badParts++;
    }
    this.production.totalWeight += this.getRandomValue(0.1, 0.2);
    this.updateCycleTimeAverage();

    this.partCountIntervalMs = this.getRandomValue(60_000, 80_000);
    this.nextPartCountAt = now + this.partCountIntervalMs;
    this.machineStatus.cycleTime = this.partCountIntervalMs / 1000;
    this.clamping.isOpen = true;
    this.clamping.position = 100;
    this.mold.openPosition = 100;
  }

  /**
   * Open mold
   */
  openMold() {
    this.clamping.isOpen = true;
    this.clamping.position = 100;
    this.mold.openPosition = 100;
  }

  /**
   * Close mold
   */
  closeMold() {
    this.clamping.isOpen = false;
    this.clamping.position = 0;
    this.mold.openPosition = 0;
  }

  /**
   * Set heating zone setpoint
   */
  setHeatingZoneSetpoint(zone, setpoint) {
    if (zone >= 1 && zone <= this.heatingZones.length) {
      this.heatingZones[zone - 1].setpoint = setpoint;
    }
  }

  /**
   * Emergency stop
   */
  emergencyStop() {
    this.stopProduction();
    this.setStatus("Emergency");
    this.alarms.push({
      code: "A001",
      message: "Emergency Stop Activated",
      timestamp: new Date(),
    });
  }

  /**
   * Reset alarms
   */
  resetAlarms() {
    this.alarms = [];
    this.warnings = [];
    this.setStatus("Idle");
  }

  /**
   * Update average cycle time
   */
  updateCycleTimeAverage() {
    this.production.cycleTimeAverage =
      (this.production.cycleTimeAverage * (this.production.totalCycles - 1) +
        this.machineStatus.lastCycleTime) /
      this.production.totalCycles;
  }

  /**
   * Helper function
   */
  getRandomValue(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      name: this.name,
      productName: this.productName,
      moldName: this.moldName,
      status: this.statusCode,
      statusName: this.statusName,
      power: this.power,
      machineStatus: this.machineStatus,
      heatingZones: this.heatingZones,
      nozzle: this.nozzle,
      mold: this.mold,
      injectionUnit: this.injectionUnit,
      clamping: this.clamping,
      screw: this.screw,
      production: this.production,
      alarms: this.alarms,
      warnings: this.warnings,
    };
  }

  /**
   * Get full machine state as JSON string
   * Method yang hanya bisa di-access lewat OPC UA method call
   */
  getFullStateJSON() {
    return JSON.stringify(this.getState());
  }

  /**
   * Get production report
   * Returning detailed production statistics
   */
  getProductionReport() {
    const totalProduced = this.production.totalCycles;
    const efficiency = totalProduced > 0 
      ? ((this.production.goodParts / totalProduced) * 100).toFixed(2)
      : 0;

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      totalCycles: this.production.totalCycles,
      goodParts: this.production.goodParts,
      badParts: this.production.badParts,
      averageCycleTime: this.production.cycleTimeAverage.toFixed(2),
      totalWeight: this.production.totalWeight.toFixed(2),
      efficiency: `${efficiency}%`,
      status: this.statusCode,
      statusName: this.statusName,
    });
  }

  /**
   * Get temperature report
   * All heating zones and nozzle temperatures
   */
  getTemperatureReport() {
    const zones = this.heatingZones.map((zone) => ({
      zone: zone.zone,
      setpoint: zone.setpoint,
      actual: zone.actual.toFixed(2),
      enabled: zone.enabled,
    }));

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      heatingZones: zones,
      nozzle: {
        setpoint: this.nozzle.setpoint,
        actual: this.nozzle.actual.toFixed(2),
        enabled: this.nozzle.enabled,
      },
      mold: {
        setpoint: this.mold.setpoint,
        actual: this.mold.actual.toFixed(2),
        enabled: this.mold.enabled,
      },
    });
  }

  /**
   * Get alarm and warning log
   */
  getAlarmLog() {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      machineStatus: this.statusCode,
      machineStatusName: this.statusName,
      alarmCount: this.alarms.length,
      warningCount: this.warnings.length,
      alarms: this.alarms,
      warnings: this.warnings,
    });
  }

  /**
   * Get diagnostics report
   */
  getDiagnosticsReport() {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      machineName: this.name,
      status: this.statusCode,
      statusName: this.statusName,
      power: this.power,
      cycleInfo: {
        cycleCount: this.machineStatus.cycleCount,
        currentCycleTime: this.machineStatus.cycleTime,
        lastCycleTime: this.machineStatus.lastCycleTime,
      },
      injectionUnit: {
        pressure: this.injectionUnit.pressure.toFixed(2),
        maxPressure: this.injectionUnit.maxPressure,
        velocity: this.injectionUnit.velocity.toFixed(2),
        position: this.injectionUnit.position.toFixed(2),
        cushion: this.injectionUnit.cushion.toFixed(2),
      },
      clamping: {
        force: this.clamping.force.toFixed(2),
        maxForce: this.clamping.maxForce,
        isOpen: this.clamping.isOpen,
      },
      screw: {
        speed: this.screw.speed.toFixed(2),
        temperature: this.screw.temperature.toFixed(2),
        torque: this.screw.torque.toFixed(2),
      },
    });
  }
}

module.exports = InjectionMachine;
