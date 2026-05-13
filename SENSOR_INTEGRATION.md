# AgroEye Sensor & Pump Integration Guide

## Overview

AgroEye supports connecting IoT sensors and pumps via multiple protocols:

| Protocol | Best For | Range | Power | Setup |
|----------|----------|-------|-------|-------|
| **WiFi/HTTP** | Areas with WiFi coverage | ~50m | Medium | Easiest |
| **LoRa** | Remote fields, long range | 2-15 km | Very Low | Needs gateway |
| **MQTT** | Flexible IoT networks | Via broker | Medium | Needs broker |
| **Bluetooth** | Short-range, phone-based | ~10m | Low | Phone app |

## How It Works

1. **Add a Sensor/Pump**: Create it in the app, choose your protocol
2. **Download Sketch**: Get pre-configured Arduino code for your hardware
3. **Flash & Connect**: Upload to your ESP32/LoRa board
4. **Automatic Updates**: Readings flow into the app in real-time

---

## WiFi / HTTP (Default)

### API Endpoint
```
POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/sensor-data
```

### Request Body
```json
{
  "sensor_code": "AGRO-ABC123DEF",
  "moisture_level": 45.5,
  "notes": "Optional notes"
}
```

### Arduino / ESP32 Example
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* sensorCode = "AGRO-ABC123DEF";
const char* apiEndpoint = "https://YOUR_PROJECT_ID.supabase.co/functions/v1/sensor-data";
int moistureSensorPin = 34;

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(1000); }
}

void loop() {
  int sensorValue = analogRead(moistureSensorPin);
  float moistureLevel = map(sensorValue, 4095, 1500, 0, 100);
  
  HTTPClient http;
  http.begin(apiEndpoint);
  http.addHeader("Content-Type", "application/json");
  String payload = "{\"sensor_code\":\"" + String(sensorCode) + "\",\"moisture_level\":" + String(moistureLevel) + "}";
  http.POST(payload);
  http.end();
  
  delay(300000); // 5 minutes
}
```

### Python (Raspberry Pi)
```python
import requests, time

SENSOR_CODE = "AGRO-ABC123DEF"
API_ENDPOINT = "https://YOUR_PROJECT_ID.supabase.co/functions/v1/sensor-data"

while True:
    moisture = 45.5  # Replace with your sensor reading
    requests.post(API_ENDPOINT, json={"sensor_code": SENSOR_CODE, "moisture_level": moisture})
    time.sleep(300)
```

### cURL Test
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/sensor-data \
  -H "Content-Type: application/json" \
  -d '{"sensor_code": "AGRO-ABC123DEF", "moisture_level": 45.5}'
```

---

## LoRa (Long Range)

LoRa is ideal for remote fields without WiFi. Sensors send data to a **LoRa gateway** which forwards it to AgroEye via HTTP webhook.

### Supported Gateways
- **The Things Network (TTN)** v3
- **Chirpstack** v3/v4
- **Dragino** LPS8, LG308

### Setup Steps

1. **Register your device** on TTN or Chirpstack with your Device EUI
2. **Add sensor in AgroEye** → Select "LoRa" protocol → Enter Device EUI
3. **Configure webhook** on your LoRa network server:

**Webhook URL:**
```
POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/lora-webhook
```

**TTN Webhook Setup:**
- Go to TTN Console → Applications → Your App → Integrations → Webhooks
- Add webhook: Base URL = your webhook URL above
- Enable "Uplink message" event

**Chirpstack Webhook Setup:**
- Go to Chirpstack → Applications → Your App → Integrations → HTTP
- Add endpoint: URL = your webhook URL above
- Event types: "up" (uplink)

### Payload Format

AgroEye auto-decodes these payload formats:

| Format | Bytes | Description |
|--------|-------|-------------|
| 2-byte moisture | `[MSB, LSB]` | `value / 100` = moisture % |
| Dragino LSE01 | 6+ bytes | Battery (2B) + Temp (2B) + Moisture (2B) |
| Pre-decoded | JSON | Gateway decodes before forwarding |

### Arduino LoRa Sketch
The app generates a complete RadioLib-based sketch when you select LoRa protocol. It includes:
- SX1276/SX1278 radio initialization
- Payload encoding (2-byte moisture)
- Deep sleep for battery saving
- 10-minute send interval (respects duty cycle)

---

## MQTT

MQTT is a lightweight messaging protocol. Sensors publish data to an MQTT broker, which can be bridged to AgroEye.

### Setup Steps

1. **Set up an MQTT broker** (HiveMQ Cloud free tier, Mosquitto, etc.)
2. **Add sensor in AgroEye** → Select "MQTT" protocol
3. **Bridge MQTT to HTTP**: Use Node-RED, MQTT-to-HTTP bridge, or a cloud function to forward messages to the sensor-data endpoint

### MQTT Topic
```
agroeye/{SENSOR_CODE}/data
```

### MQTT Message Format
```json
{"sensor_code": "AGRO-ABC123DEF", "moisture_level": 45.5}
```

### Arduino MQTT Sketch
The app generates a PubSubClient-based sketch. Configure:
- WiFi credentials
- MQTT broker address and port
- Optional MQTT username/password

---

## Bluetooth

Bluetooth sensors pair directly with your phone. Data flows:
`Sensor → Phone (BLE) → AgroEye App → Database`

This requires the Capacitor BLE plugin in the native mobile app.

---

## API Responses

### Success (200)
```json
{
  "success": true,
  "reading_id": "uuid",
  "sensor_name": "Garden Bed 1",
  "status": "optimal"
}
```

### Errors
| Code | Message |
|------|---------|
| 400 | Missing required fields / Invalid moisture level |
| 404 | Sensor not found or inactive |
| 500 | Internal server error |

## Moisture Status

| Range | Status | Action |
|-------|--------|--------|
| 0-29% | Low | Water needed |
| 30-70% | Optimal | No action |
| 71-100% | High | Reduce watering |

## Pump Integration

Pumps connect via the same protocols. The app generates pump controller sketches that:
- Read soil moisture locally
- Auto-control relay based on thresholds
- Report status back to AgroEye

## Tips

1. **WiFi**: Send readings every 5-30 minutes
2. **LoRa**: Use 10+ minute intervals (duty cycle limits)
3. **MQTT**: QoS 1 for reliable delivery
4. **Battery**: Use deep sleep on ESP32 for months of operation
5. **Calibrate**: Adjust sensor readings for your specific soil type

## Security

- Sensor codes are unique identifiers — keep them private
- LoRa webhook accepts any valid gateway payload (no auth required)
- For production, add API key validation to edge functions
- Delete and recreate sensors if codes are compromised
