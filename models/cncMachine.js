/**
 * CNC Machine Simulator
 * Simulasi mesin CNC dengan parameter-parameter standar
 */
class CNCMachine {
  constructor(options = {}) {
    this.name = options.name || "CNC_Machine_001";
    this.machineType = options.machineType || "CNC Milling";
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
    this.programs = options.programs || [
      "PRG_FACE_PLATE_A",
      "PRG_BRACKET_B",
      "PRG_SHAFT_C",
      "PRG_HOUSING_D",
      "PRG_COVER_E",
    ];
    this.programIndex = options.programIndex || 0;
    this.programName = this.programs[this.programIndex];
    this.programChangeIntervalMs = options.programChangeIntervalMs || 3 * 60 * 60 * 1000;
    this.nextProgramChangeAt = Date.now() + this.programChangeIntervalMs;
    this.partCountIntervalMs = this.getRandomValue(60_000, 120_000);
    this.nextPartCountAt = Date.now() + this.partCountIntervalMs;
    
    // Spindle
    this.spindle = {
      speed: 0, // RPM
      maxSpeed: 24000,
      isRunning: false,
      temperature: 25,
      maxTemperature: 80,
      loadPercentage: 0,
    };

    // Axes
    this.axes = {
      X: { position: 0, feedRate: 0, minPos: -500, maxPos: 500, isMoving: false },
      Y: { position: 0, feedRate: 0, minPos: -500, maxPos: 500, isMoving: false },
      Z: { position: 0, feedRate: 0, minPos: -300, maxPos: 0, isMoving: false },
    };

    // Tool
    this.tool = {
      number: 0,
      diameter: 0,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
    };

    // Production
    this.production = {
      totalParts: 0,
      goodParts: 0,
      badParts: 0,
      estimatedTimeRemaining: 0,
    };

    // Errors
    this.errors = [];
    this.warnings = [];

    if (this.power) {
      this.setStatus("Running");
      this.spindle.isRunning = true;
      this.production.estimatedTimeRemaining = 3600;
    }
  }

  /**
   * Simulasi gerakan mesin
   */
  simulateMovement() {
    const now = Date.now();
    this.rotateStatusIfNeeded(now);
    this.rotateProgramIfNeeded(now);

    if (!this.power || this.statusName === "Disconnected") {
      this.applyStoppedValues();
      return;
    }

    switch (this.statusName) {
      case "Running":
        this.applyRunningValues();
        break;
      case "Setup":
        this.applySetupValues();
        break;
      case "Paused":
      case "Idle":
        this.applyIdleValues();
        break;
      case "Emergency":
      case "Down":
      default:
        this.applyStoppedValues();
        break;
    }

    if (this.statusName === "Running" && now >= this.nextPartCountAt) {
      this.incrementPartCount(now);
    }
  }

  applyRunningValues() {
    this.spindle.isRunning = true;
    this.axes.X.position = this.getRandomValue(this.axes.X.minPos, this.axes.X.maxPos);
    this.axes.Y.position = this.getRandomValue(this.axes.Y.minPos, this.axes.Y.maxPos);
    this.axes.Z.position = this.getRandomValue(this.axes.Z.minPos, 0);
    this.axes.X.feedRate = this.getRandomValue(120, 1200);
    this.axes.Y.feedRate = this.getRandomValue(120, 1200);
    this.axes.Z.feedRate = this.getRandomValue(80, 600);
    this.spindle.speed = this.getRandomValue(this.spindle.maxSpeed * 0.45, this.spindle.maxSpeed);
    this.spindle.temperature = this.getRandomValue(45, 78);
    this.spindle.loadPercentage = this.getRandomValue(30, 95);
  }

  applySetupValues() {
    this.spindle.isRunning = true;
    this.axes.X.position = this.getRandomValue(this.axes.X.minPos * 0.2, this.axes.X.maxPos * 0.2);
    this.axes.Y.position = this.getRandomValue(this.axes.Y.minPos * 0.2, this.axes.Y.maxPos * 0.2);
    this.axes.Z.position = this.getRandomValue(-80, 0);
    this.axes.X.feedRate = this.getRandomValue(10, 180);
    this.axes.Y.feedRate = this.getRandomValue(10, 180);
    this.axes.Z.feedRate = this.getRandomValue(5, 100);
    this.spindle.speed = this.getRandomValue(300, this.spindle.maxSpeed * 0.25);
    this.spindle.temperature = this.getRandomValue(30, 48);
    this.spindle.loadPercentage = this.getRandomValue(5, 25);
  }

  applyIdleValues() {
    this.spindle.isRunning = false;
    this.axes.X.feedRate = this.getRandomValue(0, 8);
    this.axes.Y.feedRate = this.getRandomValue(0, 8);
    this.axes.Z.feedRate = this.getRandomValue(0, 5);
    this.spindle.speed = this.getRandomValue(0, 20);
    this.spindle.temperature = this.getRandomValue(28, 38);
    this.spindle.loadPercentage = this.getRandomValue(0, 3);
  }

  applyStoppedValues() {
    this.spindle.isRunning = false;
    this.spindle.speed = 0;
    this.spindle.loadPercentage = 0;
    this.axes.X.feedRate = 0;
    this.axes.Y.feedRate = 0;
    this.axes.Z.feedRate = 0;
    this.spindle.temperature = Math.max(this.spindle.temperature - this.getRandomValue(0.1, 0.4), 25);
  }

  rotateProgramIfNeeded(now) {
    if (now < this.nextProgramChangeAt) return;

    this.programIndex = (this.programIndex + 1) % this.programs.length;
    this.programName = this.programs[this.programIndex];
    this.nextProgramChangeAt = now + this.programChangeIntervalMs;
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

  incrementPartCount(now) {
    this.production.totalParts++;
    if (Math.random() > 0.05) {
      this.production.goodParts++;
    } else {
      this.production.badParts++;
    }

    this.partCountIntervalMs = this.getRandomValue(60_000, 120_000);
    this.nextPartCountAt = now + this.partCountIntervalMs;
  }

  /**
   * Start program
   */
  startProgram() {
    if (this.power && this.statusName !== "Running") {
      this.setStatus("Running");
      this.spindle.isRunning = true;
      this.production.estimatedTimeRemaining = 3600; // 1 hour
    }
  }

  /**
   * Stop program
   */
  stopProgram() {
    this.setStatus("Paused");
    this.spindle.isRunning = false;
    setTimeout(() => {
      this.setStatus("Idle");
      this.spindle.speed = 0;
    }, 2000);
  }

  /**
   * Power ON/OFF
   */
  setPower(value) {
    this.power = value;
    if (value && this.statusName !== "Running") {
      this.startProgram();
    } else if (!value) {
      this.setStatus("Disconnected");
      this.spindle.isRunning = false;
      this.spindle.speed = 0;
      this.spindle.loadPercentage = 0;
      this.axes.X.feedRate = 0;
      this.axes.Y.feedRate = 0;
      this.axes.Z.feedRate = 0;
    }
  }

  /**
   * Set spindle speed
   */
  setSpindleSpeed(speed) {
    if (speed <= this.spindle.maxSpeed) {
      this.spindle.speed = speed;
    }
  }

  /**
   * Emergency stop
   */
  emergencyStop() {
    this.setStatus("Emergency");
    this.spindle.isRunning = false;
    this.spindle.speed = 0;
    this.errors.push({
      code: "E001",
      message: "Emergency Stop Activated",
      timestamp: new Date(),
    });
  }

  /**
   * Reset errors
   */
  resetErrors() {
    this.errors = [];
    this.warnings = [];
    this.setStatus("Idle");
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
      machineType: this.machineType,
      programName: this.programName,
      status: this.statusCode,
      statusName: this.statusName,
      power: this.power,
      spindle: this.spindle,
      axes: this.axes,
      tool: this.tool,
      production: this.production,
      errors: this.errors,
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
    const totalProduced = this.production.totalParts;
    const efficiency = totalProduced > 0 
      ? ((this.production.goodParts / totalProduced) * 100).toFixed(2)
      : 0;

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      totalProduced: this.production.totalParts,
      goodParts: this.production.goodParts,
      badParts: this.production.badParts,
      efficiency: `${efficiency}%`,
      status: this.statusCode,
      statusName: this.statusName,
    });
  }

  /**
   * Get error and warning log
   */
  getErrorLog() {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      machineStatus: this.statusCode,
      machineStatusName: this.statusName,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: this.errors,
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
      spindle: {
        speed: this.spindle.speed.toFixed(2),
        temperature: this.spindle.temperature.toFixed(2),
        maxTemperature: this.spindle.maxTemperature,
        load: this.spindle.loadPercentage.toFixed(2),
        isRunning: this.spindle.isRunning,
      },
      axes: {
        X: {
          position: this.axes.X.position.toFixed(2),
          feedRate: this.axes.X.feedRate.toFixed(2),
        },
        Y: {
          position: this.axes.Y.position.toFixed(2),
          feedRate: this.axes.Y.feedRate.toFixed(2),
        },
        Z: {
          position: this.axes.Z.position.toFixed(2),
          feedRate: this.axes.Z.feedRate.toFixed(2),
        },
      },
    });
  }
}

module.exports = CNCMachine;
