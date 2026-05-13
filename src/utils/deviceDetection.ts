/**
 * AI-powered device detection for sensors and pumps
 * Parses QR codes and identifies hardware models automatically
 */

export interface DeviceInfo {
  deviceType: "sensor" | "pump" | "unknown";
  code: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  specs?: {
    type?: string;
    protocol?: string;
    voltage?: string;
    flowRate?: number; // for pumps
    accuracy?: string; // for sensors
  };
  confidence: "high" | "medium" | "low";
}

// Known device patterns from various manufacturers
const DEVICE_PATTERNS: Array<{
  pattern: RegExp;
  info: Partial<DeviceInfo>;
}> = [
  // ESP32-based sensors
  { pattern: /ESP32[-_]?CAP[-_]?SOIL/i, info: { deviceType: "sensor", manufacturer: "Generic", model: "ESP32 Capacitive Soil", specs: { type: "moisture", protocol: "WiFi", voltage: "3.3V" } } },
  { pattern: /ESP32[-_]?DHT22/i, info: { deviceType: "sensor", manufacturer: "Generic", model: "ESP32 + DHT22", specs: { type: "temperature", protocol: "WiFi", voltage: "3.3V" } } },
  { pattern: /ESP8266[-_]?BME/i, info: { deviceType: "sensor", manufacturer: "Generic", model: "ESP8266 + BME280", specs: { type: "temperature", protocol: "WiFi", voltage: "3.3V" } } },
  
  // Commercial sensors
  { pattern: /SEN0193/i, info: { deviceType: "sensor", manufacturer: "DFRobot", model: "Capacitive Soil Moisture Sensor", specs: { type: "moisture", voltage: "3.3-5V", accuracy: "±5%" } } },
  { pattern: /SEN0169/i, info: { deviceType: "sensor", manufacturer: "DFRobot", model: "Analog pH Sensor", specs: { type: "ph", voltage: "5V", accuracy: "±0.1 pH" } } },
  { pattern: /CHIRP/i, info: { deviceType: "sensor", manufacturer: "Chirp!", model: "I2C Soil Moisture Sensor", specs: { type: "moisture", protocol: "I2C", voltage: "3.3V" } } },
  { pattern: /JXBS[-_]?3001[-_]?NPK/i, info: { deviceType: "sensor", manufacturer: "JXBS", model: "RS485 NPK Sensor", specs: { type: "npk", protocol: "RS485", voltage: "12V" } } },
  { pattern: /SHT3[01]/i, info: { deviceType: "sensor", manufacturer: "Sensirion", model: "SHT30/31 Temp & Humidity", specs: { type: "temperature", protocol: "I2C", accuracy: "±0.3°C" } } },
  { pattern: /BH1750/i, info: { deviceType: "sensor", manufacturer: "ROHM", model: "BH1750 Light Sensor", specs: { type: "light", protocol: "I2C", voltage: "3.3-5V" } } },
  { pattern: /TSL2591/i, info: { deviceType: "sensor", manufacturer: "Adafruit", model: "TSL2591 Lux Sensor", specs: { type: "light", protocol: "I2C" } } },
  { pattern: /YF[-_]?S201/i, info: { deviceType: "sensor", manufacturer: "Generic", model: "YF-S201 Water Flow", specs: { type: "flow", voltage: "5V" } } },
  
  // LoRa sensors
  { pattern: /LORA[-_]?(SOIL|MOIS)/i, info: { deviceType: "sensor", manufacturer: "Generic", model: "LoRa Soil Node", specs: { type: "moisture", protocol: "LoRa" } } },
  { pattern: /DRAGINO[-_]?LSE01/i, info: { deviceType: "sensor", manufacturer: "Dragino", model: "LSE01 Soil Moisture", specs: { type: "moisture", protocol: "LoRa" } } },
  
  // Pumps
  { pattern: /PUMP[-_]?SUB(MERSIBLE)?[-_]?\d*/i, info: { deviceType: "pump", manufacturer: "Generic", model: "Submersible Pump", specs: { type: "submersible", flowRate: 15 } } },
  { pattern: /PUMP[-_]?CENT(RIFUGAL)?/i, info: { deviceType: "pump", manufacturer: "Generic", model: "Centrifugal Pump", specs: { type: "centrifugal", flowRate: 30 } } },
  { pattern: /DRIP[-_]?PUMP/i, info: { deviceType: "pump", manufacturer: "Generic", model: "Drip Irrigation Pump", specs: { type: "drip", flowRate: 5 } } },
  { pattern: /SPRINKLER[-_]?SYS/i, info: { deviceType: "pump", manufacturer: "Generic", model: "Sprinkler System", specs: { type: "sprinkler", flowRate: 20 } } },
  { pattern: /RELAY[-_]?\d*CH/i, info: { deviceType: "pump", manufacturer: "Generic", model: "Relay Module Pump", specs: { type: "submersible" } } },
  
  // ESP32 pump controllers
  { pattern: /ESP32[-_]?PUMP/i, info: { deviceType: "pump", manufacturer: "Generic", model: "ESP32 Pump Controller", specs: { type: "submersible", protocol: "WiFi" } } },
  { pattern: /SONOFF[-_]?TH/i, info: { deviceType: "pump", manufacturer: "ITEAD", model: "Sonoff TH Smart Relay", specs: { type: "submersible", protocol: "WiFi" } } },
];

/**
 * Parse QR code or raw text and identify the device
 */
export function detectDevice(raw: string): DeviceInfo | null {
  if (!raw || raw.trim().length < 3) return null;

  let parsed: any = null;
  let code = raw.trim();

  // Try JSON format first
  try {
    parsed = JSON.parse(raw);
    code = parsed.sensor_code || parsed.pump_id || parsed.code || parsed.id || parsed.device_id || code;
  } catch {
    // Not JSON
  }

  // Try URL format
  try {
    const url = new URL(raw);
    code = url.searchParams.get("sensor_code") 
      || url.searchParams.get("pump_id") 
      || url.searchParams.get("code") 
      || url.searchParams.get("id")
      || code;
  } catch {
    // Not URL
  }

  // Build device info starting from parsed JSON data if available
  const info: DeviceInfo = {
    deviceType: "unknown",
    code: code.toUpperCase(),
    confidence: "low",
  };

  // If parsed JSON has device info, use it
  if (parsed) {
    if (parsed.app === "agroeye") {
      info.confidence = "high";
    }
    if (parsed.sensor_type || parsed.type) {
      info.deviceType = "sensor";
      info.specs = { type: parsed.sensor_type || parsed.type };
    }
    if (parsed.pump_type) {
      info.deviceType = "pump";
      info.specs = { type: parsed.pump_type };
    }
    if (parsed.name || parsed.sensor_name || parsed.pump_name) {
      info.name = parsed.name || parsed.sensor_name || parsed.pump_name;
    }
    if (parsed.manufacturer) info.manufacturer = parsed.manufacturer;
    if (parsed.model) info.model = parsed.model;
    if (parsed.flow_rate) info.specs = { ...info.specs, flowRate: parsed.flow_rate };
  }

  // Try to match against known patterns
  const combinedText = `${raw} ${code}`.toUpperCase();
  for (const { pattern, info: patternInfo } of DEVICE_PATTERNS) {
    if (pattern.test(combinedText)) {
      Object.assign(info, patternInfo);
      info.code = code;
      info.confidence = "high";
      break;
    }
  }

  // Heuristic detection based on prefix
  if (info.deviceType === "unknown") {
    if (/^(AGRO|SEN|SENS|SOIL|NPK|PH|TEMP|DHT|BME|SHT|MOIS)/i.test(code)) {
      info.deviceType = "sensor";
      info.confidence = "medium";
    } else if (/^(PUMP|RELAY|DRIP|SPRINK|IRRIG)/i.test(code)) {
      info.deviceType = "pump";
      info.confidence = "medium";
    } else if (code.length >= 5) {
      // Unknown device with valid code
      info.confidence = "low";
    } else {
      return null;
    }
  }

  // Generate friendly name if not set
  if (!info.name) {
    info.name = info.model 
      || (info.deviceType === "pump" ? `Pump ${code.slice(-4)}` : `Sensor ${code.slice(-4)}`);
  }

  return info;
}

/**
 * Get human-readable description for a device
 */
export function getDeviceDescription(device: DeviceInfo): string {
  const parts: string[] = [];
  
  if (device.manufacturer && device.manufacturer !== "Generic") {
    parts.push(device.manufacturer);
  }
  if (device.model) {
    parts.push(device.model);
  }
  if (device.specs?.type) {
    parts.push(`(${device.specs.type})`);
  }
  if (device.specs?.protocol) {
    parts.push(`via ${device.specs.protocol}`);
  }

  return parts.join(" ") || device.name || device.code;
}

/**
 * Generate a setup recommendation for the device
 */
export function getSetupRecommendation(device: DeviceInfo): string {
  const type = device.specs?.type || "unknown";
  const protocol = device.specs?.protocol || "WiFi";

  if (device.deviceType === "sensor") {
    const sensorRecs: Record<string, string> = {
      moisture: "Place probe 2-4 inches deep in soil, away from direct water runoff.",
      temperature: "Mount in shaded area at plant canopy height for accurate readings.",
      ph: "Calibrate with pH 4.0 and 7.0 buffer solutions before first use.",
      npk: "Connect via RS485 adapter. Readings every 30 min recommended.",
      light: "Mount above canopy facing upward for accurate PAR measurement.",
      flow: "Install inline with irrigation pipe. Note flow direction arrow.",
    };
    return sensorRecs[type] || "Flash the Arduino sketch and configure WiFi credentials.";
  }

  if (device.deviceType === "pump") {
    return `Connect relay to GPIO 4. Wire pump to relay NO/COM terminals. ${device.specs?.flowRate ? `Flow rate: ${device.specs.flowRate} L/min.` : ""}`;
  }

  return "Download the Arduino sketch and configure your device credentials.";
}

/**
 * Suggest sensor type based on device detection
 */
export function suggestSensorType(device: DeviceInfo): string {
  const typeMap: Record<string, string> = {
    moisture: "moisture",
    temperature: "temperature",
    ph: "ph",
    npk: "npk",
    light: "light",
    flow: "flow",
    rain: "rain",
    wind: "wind",
  };
  return typeMap[device.specs?.type || ""] || "moisture";
}

/**
 * Suggest pump type based on device detection
 */
export function suggestPumpType(device: DeviceInfo): "submersible" | "centrifugal" | "drip" | "sprinkler" {
  const typeMap: Record<string, "submersible" | "centrifugal" | "drip" | "sprinkler"> = {
    submersible: "submersible",
    centrifugal: "centrifugal",
    drip: "drip",
    sprinkler: "sprinkler",
  };
  return typeMap[device.specs?.type || ""] || "submersible";
}
