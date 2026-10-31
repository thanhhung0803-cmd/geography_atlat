#include <WiFi.h>
#include <HTTPClient.h>

// WIFI_SSID, WIFI_PASSWORD and TB_TOKEN live in secrets.h (not in git).
// Copy secrets.example.h to secrets.h and fill in real values.
#include "secrets.h"

// ThingsBoard HTTP settings
static const char* TB_HOST = "thingsboard.cloud";      // host only
static String TB_ATTRIBUTES_URL;                       // built in setup

// GPIO pins
static const uint8_t PIN18 = 18;
static const uint8_t PIN19 = 19;
static const uint8_t PIN23 = 23;

// Previous states for rising-edge detection
int prev18 = LOW;
int prev19 = LOW;
int prev23 = LOW;

static HTTPClient http;

static void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print('.');
    if (millis() - start > 20000) {
      Serial.println("\nWiFi connect timeout, retrying...");
      WiFi.disconnect(true);
      delay(500);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      start = millis();
    }
  }
  Serial.printf("\nWiFi connected. IP: %s\n", WiFi.localIP().toString().c_str());
}

static bool postAttributesJson(const char* jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) return false;
  if (TB_ATTRIBUTES_URL.length() == 0) return false;

  http.begin(TB_ATTRIBUTES_URL);
  http.setReuse(false);
  http.setTimeout(5000);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST((uint8_t*)jsonPayload, strlen(jsonPayload));
  Serial.printf("HTTP POST %s => code %d\n", TB_ATTRIBUTES_URL.c_str(), code);
  if (code > 0) {
    String resp = http.getString();
    if (resp.length() > 0) {
      Serial.println(resp);
    }
  }
  http.end();
  return code == 200 || code == 204;
}

static void ensureConnections() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
}

static void handlePinRisingEdge(uint8_t pin, int& prevState, uint8_t positionValue) {
  int current = digitalRead(pin);
  if (current != prevState) {
    if (current == HIGH) {
      char payload[32];
      snprintf(payload, sizeof(payload), "{\"position\":%u}", positionValue);
      postAttributesJson(payload);
    }
    prevState = current;
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(PIN18, INPUT_PULLDOWN);
  pinMode(PIN19, INPUT_PULLDOWN);
  pinMode(PIN23, INPUT_PULLDOWN);

  // Initialize prev states to current readings to avoid spurious publish on boot
  prev18 = digitalRead(PIN18);
  prev19 = digitalRead(PIN19);
  prev23 = digitalRead(PIN23);

  connectWiFi();
  TB_ATTRIBUTES_URL = String("http://") + TB_HOST + "/api/v1/" + TB_TOKEN + "/telemetry";
  Serial.printf("Attributes URL: %s\n", TB_ATTRIBUTES_URL.c_str());
}

void loop() {
  ensureConnections();

  handlePinRisingEdge(PIN18, prev18, 2);
  handlePinRisingEdge(PIN19, prev19, 1);
  handlePinRisingEdge(PIN23, prev23, 3);

  delay(10);
}
