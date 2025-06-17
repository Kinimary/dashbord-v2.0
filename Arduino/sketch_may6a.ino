#include <Arduino.h>
#include <WiFi.h>
#include <EEPROM.h>
#include <TimeLib.h>
#include <WiFiUdp.h>
#include <ArduinoHttpClient.h>
#include "config.h"

WiFiClient wifi;
HttpClient client = HttpClient(wifi, SERVER_HOST, SERVER_PORT);

unsigned long visitorCount = 0;
unsigned long lastResetDate = 0;

bool shouldReconnect = false;
const unsigned long reconnectInterval = 30000;
unsigned long lastReconnectAttempt = 0;

bool visitorInside = false;
int consecutiveInsideCount = 0;
int consecutiveOutsideCount = 0;

unsigned long lastSendTime = 0;
unsigned long lastSentCount = 0;

unsigned long lastResetMillis = 0;

unsigned long lastTimeSaveMillis = 0;

bool visitorCountChanged = false;

WiFiUDP udp;

unsigned long lastNtpSync = 0; 

byte packetBuffer[NTP_PACKET_SIZE]; 

void logInfo(const String& message) {
 #if LOG_LEVEL >= 1
  Serial.println(message);
 #endif
}

void logDebug(const String& message) {
 #if LOG_LEVEL >= 2
  Serial.println(message);
 #endif
}

void loadVisitorCount() {
  EEPROM.get(EEPROM_ADDR_COUNT, visitorCount);
  if (visitorCount > 1000000) visitorCount = 0;
}

void saveVisitorCount() {
  EEPROM.put(EEPROM_ADDR_COUNT, visitorCount);
}

void loadLastResetDate() {
  EEPROM.get(EEPROM_ADDR_DATE, lastResetDate);
  if (lastResetDate == 0xFFFFFFFF) lastResetDate = 0;
}

void saveLastResetDate(unsigned long date) {
  EEPROM.put(EEPROM_ADDR_DATE, date);
}

void saveCurrentTimeToEEPROM() {
  time_t currentTime = now();
  EEPROM.put(EEPROM_ADDR_TIME, currentTime);
}

bool loadTimeFromEEPROM() {
  time_t savedTime;
  EEPROM.get(EEPROM_ADDR_TIME, savedTime);
  if (savedTime < 1609459200) {
    return false;
  }
  setTime(savedTime);
  return true;
}

unsigned long getCurrentDate() {
  int y = year();
  int mo = month();
  int d = day();
  if (y < 2020 || y > 2099) {
    return 0;
  }
  return (unsigned long)(y * 10000 + mo * 100 + d);
}

void setTimeFromSerial(String input) {
  if (input.length() < 19) {
    logInfo("Неверный формат времени");
    return;
  }
  int y = input.substring(0,4).toInt();
  int mo = input.substring(5,7).toInt();
  int d = input.substring(8,10).toInt();
  int h = input.substring(11,13).toInt();
  int mi = input.substring(14,16).toInt();
  int s = input.substring(17,19).toInt();
  if (y < 2020 || y > 2099 || mo < 1 || mo > 12 || d < 1 || d > 31 ||
      h < 0 || h > 23 || mi < 0 || mi > 59 || s < 0 || s > 59) {
    logInfo("Неверный формат времени");
    return;
  }
  setTime(h, mi, s, d, mo, y);
}

void printCurrentDateTime() {
  #if LOG_LEVEL >= 1
  Serial.print("Текущая дата и время: ");
  Serial.print(year());
  Serial.print("-");
  if (month() < 10) Serial.print("0");
  Serial.print(month());
  Serial.print("-");
  if (day() < 10) Serial.print("0");
  Serial.print(day());
  Serial.print(" ");
  if (hour() < 10) Serial.print("0");
  Serial.print(hour());
  Serial.print(":");
  if (minute() < 10) Serial.print("0");
  Serial.print(minute());
  Serial.print(":");
  if (second() < 10) Serial.print("0");
  Serial.println(second());
  #endif
}

void resetCounter() {
  visitorCount = 0;
  saveVisitorCount();
  lastResetDate = getCurrentDate();
  saveLastResetDate(lastResetDate);
  logInfo("Счётчик сброшен");
}

void checkDailyReset() {
  unsigned long currentDate = getCurrentDate();
  unsigned long now = millis();
  if (currentDate == 0) {
    return;
  }
  if (currentDate != lastResetDate && (now - lastResetMillis > MIN_RESET_INTERVAL)) {
    resetCounter();
    lastResetMillis = now;
  }
}

void checkSerialCommand() {
  while (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input == "1") {
      logInfo("Команда сброса получена");
      resetCounter();
    } else if (input.startsWith("SETTIME ")) {
      String timeStr = input.substring(8);
      setTimeFromSerial(timeStr);
    }
  }
}

void waitForWiFi() {
  uint32_t attemptCounter = 0;
  while (true) {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && (millis() - start) < 15000) {
      delay(500);
    }
    IPAddress ip = WiFi.localIP();
    if (WiFi.status() == WL_CONNECTED && ip != IPAddress(0, 0, 0, 0)) {
      shouldReconnect = false;
      return;
    }
    attemptCounter++;
    delay(30000);
  }
}

void checkConnection() {
  IPAddress ip = WiFi.localIP();
  bool wifiNotConnected = (WiFi.status() != WL_CONNECTED);
  bool invalidIP = (ip == IPAddress(0, 0, 0, 0));
  if (wifiNotConnected || invalidIP) {
    bool needToReconnect = (!shouldReconnect || (millis() - lastReconnectAttempt > reconnectInterval));
    if (needToReconnect) {
      shouldReconnect = true;
      lastReconnectAttempt = millis();
      WiFi.disconnect();
      waitForWiFi();
    }
  }
}

long measureDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;
  long distance = duration * 0.034 / 2;
  if (distance < MIN_DISTANCE_CM) return -1;
  return distance;
}

void sendNTPpacket(IPAddress& address) {
  memset(packetBuffer, 0, NTP_PACKET_SIZE);
  packetBuffer[0] = 0b11100011;
  packetBuffer[1] = 0;
  packetBuffer[2] = 6;
  packetBuffer[3] = 0xEC;
  packetBuffer[12]  = 49;
  packetBuffer[13]  = 0x4E;
  packetBuffer[14]  = 49;
  packetBuffer[15]  = 52;
  udp.beginPacket(address, 123);
  udp.write(packetBuffer, NTP_PACKET_SIZE);
  udp.endPacket();
}

bool getNtpTime() {
  IPAddress ntpServerIP;
  if (!WiFi.hostByName("pool.ntp.org", ntpServerIP)) {
    logInfo("Не удалось получить IP NTP сервера");
    return false;
  }
  sendNTPpacket(ntpServerIP);
  unsigned long startWait = millis();
  while (millis() - startWait < 1500) {
    int size = udp.parsePacket();
    if (size >= NTP_PACKET_SIZE) {
      udp.read(packetBuffer, NTP_PACKET_SIZE);
      unsigned long highWord = word(packetBuffer[40], packetBuffer[41]);
      unsigned long lowWord = word(packetBuffer[42], packetBuffer[43]);
      unsigned long secsSince1900 = (highWord << 16) | lowWord;
      const unsigned long seventyYears = 2208988800UL;
      unsigned long epoch = secsSince1900 - seventyYears;
      setTime(epoch + TIME_ZONE_OFFSET * 3600); 
      logInfo("Время синхронизировано с NTP сервером");
      return true;
    }
    delay(10);
  }
  logInfo("Не удалось синхронизировать время с NTP сервера");
  return false;
}

void sendDataToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    logInfo("WiFi не подключен");
    return;
  }

  String url = API_ENDPOINT;
  String jsonPayload = "{";
  jsonPayload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  jsonPayload += "\"count\":" + String(visitorCount) + ",";
  jsonPayload += "\"timestamp\":" + String((unsigned long)now()) + ",";
  jsonPayload += "\"status\":\"online\"";
  jsonPayload += "}";

  logDebug("Отправляемые данные: " + jsonPayload);

  client.setTimeout(10); // Установите таймаут в 10 секунд
  int statusCode = client.post(url, "application/json", jsonPayload);

  logDebug("Код ответа: " + String(statusCode));
  logDebug("Тело ответа: " + client.responseBody());

  if (statusCode == 200) {
    logInfo("Данные успешно отправлены на сервер");
  } else {
    logInfo("Ошибка отправки данных на сервер. Код ответа: " + String(statusCode));
  }

  client.stop();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  delay(2000);

  udp.begin(2390);

  loadVisitorCount();
  loadLastResetDate();

  if (getNtpTime()) {
    saveCurrentTimeToEEPROM();
  } else {
    loadTimeFromEEPROM();
  }

  lastSentCount = visitorCount;

  logInfo("Для установки времени введите команду:");
  logInfo("SETTIME YYYY-MM-DD HH:MM:SS");
  logInfo("Для сброса счётчика введите: 1");
  logInfo(String("Текущий счётчик: ") + visitorCount);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  checkSerialCommand();
  checkDailyReset();
  checkConnection();

  IPAddress ip = WiFi.localIP();
  logInfo(String("Текущий IP: ") + ip.toString());
  logInfo(String("WiFi статус: ") + (WiFi.status() == WL_CONNECTED ? "Подключен" : "Не подключен"));

  printCurrentDateTime();

  unsigned long now = millis();

  if (now - lastNtpSync > NTP_SYNC_INTERVAL) {
    getNtpTime();
    lastNtpSync = now;
  }

  if (now - lastTimeSaveMillis > TIME_SAVE_INTERVAL) {
    saveCurrentTimeToEEPROM();
    lastTimeSaveMillis = now;
  }

  long distance = measureDistance();

  if (distance != -1) {
    logDebug(String("Расстояние: ") + distance + " см");

    if (!visitorInside) {
      if (distance <= ZONE_THRESHOLD_CM) {
        consecutiveInsideCount++;
        consecutiveOutsideCount = 0;
        logDebug(String("Посетитель внутри зоны, consecutiveInsideCount: ") + consecutiveInsideCount);
        if (consecutiveInsideCount >= REQUIRED_CONSECUTIVE_MEASUREMENTS) {
          visitorInside = true;
          consecutiveInsideCount = 0;
          logInfo("Посетитель вошёл в зону");
        }
      } else {
        consecutiveInsideCount = 0;
      }
    } else {
      if (distance > EXIT_THRESHOLD_CM) {
        consecutiveOutsideCount++;
        consecutiveInsideCount = 0;
        logDebug(String("Посетитель вне зоны, consecutiveOutsideCount: ") + consecutiveOutsideCount);
        if (consecutiveOutsideCount >= REQUIRED_CONSECUTIVE_MEASUREMENTS) {
          visitorInside = false;
          consecutiveOutsideCount = 0;
          visitorCount++;
          visitorCountChanged = true;
          saveVisitorCount();
          logInfo(String("Посетитель вышел из зоны, увеличиваем счётчик: ") + visitorCount);
        }
      } else {
        consecutiveOutsideCount = 0;
      }
    }
  } else {
    logDebug("⚠️ Ошибка измерения расстояния");
  }

  if (now - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = now;
    if (visitorCountChanged) {
      sendDataToServer();
      lastSentCount = visitorCount;
      visitorCountChanged = false;
    }
  }

  delay(MEASUREMENT_INTERVAL);
}