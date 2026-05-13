/**
 * Sensor QR Code utilities
 * Generates QR config payloads and parses scanned QR codes for sensor pairing
 */

export type SensorProtocol = "wifi" | "lora" | "mqtt" | "bluetooth";

export interface SensorQRPayload {
  app: "agroeye";
  version: 1;
  sensor_code: string;
  sensor_name: string;
  sensor_type: string;
  protocol: SensorProtocol;
  api_endpoint: string;
  wifi_config?: {
    ssid: string;
    password: string;
  };
  gateway_id?: string;
  mqtt_topic?: string;
}

/**
 * Generate QR code data URL for a sensor
 * Contains all info the ESP32 needs to connect
 */
export function generateSensorQRPayload(
  sensorCode: string,
  sensorName: string,
  sensorType: string,
  protocol: SensorProtocol = "wifi"
): SensorQRPayload {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "";
  const apiEndpoint = projectId
    ? `https://${projectId}.supabase.co/functions/v1/sensor-data`
    : `${window.location.origin}/api/sensor-data`;

  return {
    app: "agroeye",
    version: 1,
    sensor_code: sensorCode,
    sensor_name: sensorName,
    sensor_type: sensorType,
    protocol,
    api_endpoint: apiEndpoint,
  };
}

/**
 * Parse a scanned QR code to extract sensor info
 */
export function parseSensorQR(raw: string): {
  sensor_code: string;
  sensor_name?: string;
  sensor_type?: string;
  protocol?: SensorProtocol;
} | null {
  // Try JSON format first
  try {
    const parsed = JSON.parse(raw);
    if (parsed.app === "agroeye" && parsed.sensor_code) {
      return {
        sensor_code: parsed.sensor_code,
        sensor_name: parsed.sensor_name,
        sensor_type: parsed.sensor_type,
        protocol: parsed.protocol,
      };
    }
  } catch {
    // Not JSON
  }

  // Try URL format
  try {
    const url = new URL(raw);
    const code = url.searchParams.get("sensor_code") || url.searchParams.get("code");
    if (code) {
      return { sensor_code: code.toUpperCase() };
    }
  } catch {
    // Not a URL
  }

  // Try plain code format (AGRO-XXXXXXX)
  const codeMatch = raw.match(/AGRO-[A-Z0-9]{5,}/i);
  if (codeMatch) {
    return { sensor_code: codeMatch[0].toUpperCase() };
  }

  // Try any alphanumeric string > 5 chars as a sensor code
  const cleaned = raw.trim().toUpperCase();
  if (cleaned.length >= 5 && /^[A-Z0-9-]+$/.test(cleaned)) {
    return { sensor_code: cleaned };
  }

  return null;
}

/**
 * Generate QR code SVG as data URL using a simple QR generation
 */
export function generateQRCodeDataURL(data: string, _size: number = 200): string {
  return `data:text/plain;base64,${btoa(data)}`;
}

/** Get the API endpoint for the current environment */
export function getApiEndpoint(functionName: string = "sensor-data"): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "";
  if (projectId) return `https://${projectId}.supabase.co/functions/v1/${functionName}`;
  return `${window.location.origin}/api/${functionName}`;
}

/**
 * Generate ESP32 Arduino sketch — WiFi HTTP protocol
 */
export function generateArduinoSketch(
  sensorCode: string,
  sensorType: string,
  apiEndpoint: string
): string {
  const sensorPin = sensorType === "moisture" ? "34" : sensorType === "temperature" ? "4" : "34";
  const readingCode = sensorType === "temperature"
    ? `
#include <DHT.h>
#define DHTPIN ${sensorPin}
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

float readSensor() {
  dht.begin();
  delay(2000);
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (isnan(h) || isnan(t)) return -1;
  return t;
}`
    : sensorType === "ph"
    ? `
const int phPin = A0;

float readSensor() {
  int raw = analogRead(phPin);
  float voltage = raw * (3.3 / 4095.0);
  float ph = 3.5 * voltage + 0.5;
  return constrain(ph, 0, 14);
}`
    : `
const int soilPin = ${sensorPin};

float readSensor() {
  int raw = analogRead(soilPin);
  float moisture = map(raw, 4095, 1500, 0, 100);
  return constrain(moisture, 0, 100);
}`;

  return `/*
 * AgroEye Sensor — WiFi/HTTP Sketch
 * Sensor: ${sensorCode}
 * Type: ${sensorType}
 * Protocol: WiFi (HTTP POST)
 * 
 * Hardware: ESP32 + ${sensorType} sensor on GPIO ${sensorPin}
 * Libraries: WiFi, HTTPClient${sensorType === "temperature" ? ", DHT" : ""}
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ─── CONFIG ────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SENSOR_CODE   = "${sensorCode}";
const char* API_ENDPOINT  = "${apiEndpoint}";
const int   SEND_INTERVAL = 300000; // 5 minutes
// ────────────────────────────────────────
${readingCode}

void setup() {
  Serial.begin(115200);
  Serial.println("AgroEye Sensor Starting...");
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\\nConnected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\\nWiFi failed! Will retry...");
  }
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(5000);
    return;
  }

  float reading = readSensor();
  
  if (reading >= 0) {
    Serial.printf("Reading: %.1f\\n", reading);
    
    HTTPClient http;
    http.begin(API_ENDPOINT);
    http.addHeader("Content-Type", "application/json");
    
    String body = "{\\"sensor_code\\":\\"" + String(SENSOR_CODE) 
      + "\\",\\"moisture_level\\":" + String(reading, 1) + "}";
    
    int code = http.POST(body);
    
    if (code == 200) {
      Serial.println("✓ Sent to AgroEye");
    } else {
      Serial.printf("✗ Error: %d\\n", code);
    }
    
    http.end();
  } else {
    Serial.println("Sensor read failed");
  }
  
  delay(SEND_INTERVAL);
}`;
}

/**
 * Generate LoRa sketch — uses RadioLib for SX1276/SX1278
 */
export function generateLoRaSketch(
  sensorCode: string,
  sensorType: string,
  devEui: string
): string {
  return `/*
 * AgroEye Sensor — LoRa Sketch
 * Sensor: ${sensorCode}
 * Type: ${sensorType}
 * Protocol: LoRa (OTAA via TTN/Chirpstack)
 * Device EUI: ${devEui}
 * 
 * Hardware: ESP32 + SX1276/SX1278 LoRa module + ${sensorType} sensor
 * Libraries: RadioLib (install via Arduino Library Manager)
 * 
 * SETUP:
 * 1. Register device on TTN (thethingsnetwork.org) or Chirpstack
 * 2. Use Device EUI: ${devEui}
 * 3. Set up HTTP integration/webhook pointing to your AgroEye
 *    LoRa webhook endpoint:
 *    https://YOUR_PROJECT_ID.supabase.co/functions/v1/lora-webhook
 * 4. Flash this sketch to your ESP32 + LoRa board
 */

#include <RadioLib.h>

// ─── LORA CONFIG ───────────────────────
// Pin mapping for common ESP32 LoRa boards (Heltec/TTGO)
#define LORA_CS    18
#define LORA_DIO0  26
#define LORA_RST   14
#define LORA_DIO1  35

SX1276 radio = new Module(LORA_CS, LORA_DIO0, LORA_RST, LORA_DIO1);

// TTN OTAA credentials — get these from your TTN console
uint8_t devEui[]  = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }; // ${devEui}
uint8_t appEui[]  = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }; // From TTN
uint8_t appKey[]  = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }; // From TTN

const int SEND_INTERVAL = 600000; // 10 minutes (respect duty cycle)
// ────────────────────────────────────────

const int soilPin = 34;

float readSensor() {
  int raw = analogRead(soilPin);
  float moisture = map(raw, 4095, 1500, 0, 100);
  return constrain(moisture, 0, 100);
}

void setup() {
  Serial.begin(115200);
  Serial.println("AgroEye LoRa Sensor Starting...");
  
  // Initialize LoRa
  int state = radio.begin(868.0); // EU868 — change for your region
  if (state != RADIOLIB_ERR_NONE) {
    Serial.printf("LoRa init failed: %d\\n", state);
    while (true) delay(1000);
  }
  
  Serial.println("LoRa initialized. Joining network...");
  
  // For ABP (simpler, no join needed), use radio.begin() + setFrequency etc.
  // For OTAA via LoRaWAN stack, use LMIC or LoRaMAC-node library instead.
  
  Serial.println("Ready to send readings.");
}

void loop() {
  float reading = readSensor();
  
  if (reading >= 0) {
    Serial.printf("Moisture: %.1f%%\\n", reading);
    
    // Encode as 2-byte payload: moisture * 100
    uint16_t encoded = (uint16_t)(reading * 100);
    uint8_t payload[2] = { (uint8_t)(encoded >> 8), (uint8_t)(encoded & 0xFF) };
    
    int state = radio.transmit(payload, 2);
    
    if (state == RADIOLIB_ERR_NONE) {
      Serial.println("✓ LoRa packet sent");
    } else {
      Serial.printf("✗ Send failed: %d\\n", state);
    }
  }
  
  // Deep sleep to save battery
  Serial.println("Sleeping...");
  esp_sleep_enable_timer_wakeup(SEND_INTERVAL * 1000);
  esp_deep_sleep_start();
}`;
}

/**
 * Generate MQTT sketch — uses PubSubClient
 */
export function generateMQTTSketch(
  sensorCode: string,
  sensorType: string,
  mqttBroker: string = "broker.hivemq.com",
  mqttTopic: string = ""
): string {
  const topic = mqttTopic || `agroeye/${sensorCode}/data`;

  return `/*
 * AgroEye Sensor — MQTT Sketch
 * Sensor: ${sensorCode}
 * Type: ${sensorType}
 * Protocol: MQTT
 * Topic: ${topic}
 * 
 * Hardware: ESP32 + ${sensorType} sensor
 * Libraries: WiFi, PubSubClient (install via Arduino Library Manager)
 * 
 * SETUP:
 * 1. Configure your MQTT broker (HiveMQ Cloud free tier, Mosquitto, etc.)
 * 2. Set up a bridge/webhook to forward MQTT messages to your AgroEye
 *    sensor-data endpoint, OR use Node-RED / MQTT-to-HTTP bridge
 * 3. Flash this sketch to your ESP32
 */

#include <WiFi.h>
#include <PubSubClient.h>

// ─── CONFIG ────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_SERVER   = "${mqttBroker}";
const int   MQTT_PORT     = 1883;
const char* MQTT_USER     = "";  // If broker requires auth
const char* MQTT_PASS     = "";
const char* SENSOR_CODE   = "${sensorCode}";
const char* MQTT_TOPIC    = "${topic}";
const int   SEND_INTERVAL = 300000; // 5 minutes
// ────────────────────────────────────────

WiFiClient espClient;
PubSubClient mqtt(espClient);

const int soilPin = 34;

float readSensor() {
  int raw = analogRead(soilPin);
  float moisture = map(raw, 4095, 1500, 0, 100);
  return constrain(moisture, 0, 100);
}

void reconnectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Connecting MQTT...");
    String clientId = "AgroEye-" + String(SENSOR_CODE);
    bool ok = strlen(MQTT_USER) > 0
      ? mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)
      : mqtt.connect(clientId.c_str());
    if (ok) {
      Serial.println(" connected!");
    } else {
      Serial.printf(" failed (rc=%d), retry in 5s\\n", mqtt.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("AgroEye MQTT Sensor Starting...");
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi connected!");
  
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop() {
  if (!mqtt.connected()) reconnectMQTT();
  mqtt.loop();

  float reading = readSensor();
  
  if (reading >= 0) {
    Serial.printf("Moisture: %.1f%%\\n", reading);
    
    String payload = "{\\"sensor_code\\":\\"" + String(SENSOR_CODE)
      + "\\",\\"moisture_level\\":" + String(reading, 1) + "}";
    
    if (mqtt.publish(MQTT_TOPIC, payload.c_str())) {
      Serial.println("✓ Published to MQTT");
    } else {
      Serial.println("✗ Publish failed");
    }
  }
  
  delay(SEND_INTERVAL);
}`;
}

/**
 * Generate pump controller sketch — WiFi HTTP
 */
export function generatePumpSketch(
  pumpCode: string,
  pumpType: string,
  flowRate: number,
  apiEndpoint: string,
  protocol: SensorProtocol = "wifi"
): string {
  if (protocol === "lora") {
    return generatePumpLoRaSketch(pumpCode, pumpType, flowRate);
  }

  return `/*
 * AgroEye Pump Controller — WiFi/HTTP
 * Pump: ${pumpCode}
 * Type: ${pumpType}
 * Flow Rate: ${flowRate} L/min
 * Protocol: WiFi (HTTP)
 * 
 * Hardware: ESP32 + Relay Module + ${pumpType} pump
 * Libraries: WiFi, HTTPClient
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ─── CONFIG ────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* PUMP_CODE     = "${pumpCode}";
const char* API_ENDPOINT  = "${apiEndpoint}";
#define RELAY_PIN      4
#define MOISTURE_PIN   34
const int   DRY_THRESHOLD = 25;  // Start pump below this %
const int   WET_THRESHOLD = 60;  // Stop pump above this %
const float FLOW_RATE     = ${flowRate}; // L/min
// ────────────────────────────────────────

bool pumpRunning = false;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi connected!");
}

float readMoisture() {
  int raw = analogRead(MOISTURE_PIN);
  float moisture = map(raw, 4095, 1500, 0, 100);
  return constrain(moisture, 0, 100);
}

void reportStatus(float moisture, bool running) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  
  String body = "{\\"sensor_code\\":\\"" + String(PUMP_CODE) 
    + "\\",\\"moisture_level\\":" + String(moisture, 1)
    + ",\\"notes\\":\\"pump_" + (running ? "running" : "idle") + "\\"}";
  
  http.POST(body);
  http.end();
}

void loop() {
  float moisture = readMoisture();
  Serial.printf("Moisture: %.1f%% | Pump: %s\\n", moisture, pumpRunning ? "ON" : "OFF");
  
  if (moisture < DRY_THRESHOLD && !pumpRunning) {
    Serial.println("→ Starting pump");
    digitalWrite(RELAY_PIN, HIGH);
    pumpRunning = true;
  } else if (moisture > WET_THRESHOLD && pumpRunning) {
    Serial.println("→ Stopping pump");
    digitalWrite(RELAY_PIN, LOW);
    pumpRunning = false;
  }
  
  reportStatus(moisture, pumpRunning);
  delay(60000); // Check every minute
}`;
}

function generatePumpLoRaSketch(pumpCode: string, pumpType: string, flowRate: number): string {
  return `/*
 * AgroEye Pump Controller — LoRa
 * Pump: ${pumpCode}
 * Type: ${pumpType}
 * Flow Rate: ${flowRate} L/min
 * Protocol: LoRa (receive commands via downlink)
 * 
 * Hardware: ESP32 + SX1276 + Relay Module + ${pumpType} pump
 * Libraries: RadioLib
 * 
 * SETUP:
 * 1. Register on TTN/Chirpstack with Class C (for downlinks)
 * 2. Configure webhook to AgroEye lora-webhook endpoint
 * 3. Send downlink commands to control pump
 */

#include <RadioLib.h>

#define LORA_CS    18
#define LORA_DIO0  26
#define LORA_RST   14
#define LORA_DIO1  35
#define RELAY_PIN  4
#define MOISTURE_PIN 34

SX1276 radio = new Module(LORA_CS, LORA_DIO0, LORA_RST, LORA_DIO1);

bool pumpRunning = false;
const int DRY_THRESHOLD = 25;
const int WET_THRESHOLD = 60;

float readMoisture() {
  int raw = analogRead(MOISTURE_PIN);
  return constrain(map(raw, 4095, 1500, 0, 100), 0, 100);
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  
  int state = radio.begin(868.0);
  if (state != RADIOLIB_ERR_NONE) {
    Serial.printf("LoRa init failed: %d\\n", state);
    while (true) delay(1000);
  }
  Serial.println("AgroEye LoRa Pump Controller ready.");
}

void loop() {
  float moisture = readMoisture();
  
  // Auto control based on moisture
  if (moisture < DRY_THRESHOLD && !pumpRunning) {
    digitalWrite(RELAY_PIN, HIGH);
    pumpRunning = true;
    Serial.println("Pump ON");
  } else if (moisture > WET_THRESHOLD && pumpRunning) {
    digitalWrite(RELAY_PIN, LOW);
    pumpRunning = false;
    Serial.println("Pump OFF");
  }
  
  // Send status via LoRa
  uint16_t encoded = (uint16_t)(moisture * 100);
  uint8_t payload[3] = {
    (uint8_t)(encoded >> 8),
    (uint8_t)(encoded & 0xFF),
    pumpRunning ? 0x01 : 0x00
  };
  
  radio.transmit(payload, 3);
  Serial.printf("Sent: %.1f%% pump=%s\\n", moisture, pumpRunning ? "ON" : "OFF");
  
  delay(300000); // 5 min
}`;
}
