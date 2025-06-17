#ifndef CONFIG_H
#define CONFIG_H

// === Сетевые настройки ===
#define SERVER_HOST "172.20.10.4"   // IP адрес сервера Django
#define SERVER_PORT 1521                  // Порт сервера Django

// === API настройки ===
#define API_ENDPOINT "/api/visitor-count"

// === Настройки WiFi ===
//#define WIFI_SSID "Belwest-TOP"          // Имя вашей WiFi сети
//#define WIFI_PASSWORD "iseingae"    // Пароль от WiFi сети
#define WIFI_SSID "iPhone (Александр)"          // Имя вашей WiFi сети
#define WIFI_PASSWORD "qwertyuiop"    // Пароль от WiFi сети

// === Настройки счетчика ===
#define DEVICE_ID "ARDUINO_001"       // Уникальный ID устройства (запишите свой)

// === Настройки пинов ультразвукового датчика ===
#define TRIG_PIN 3                    // Пин триггера ультразвукового датчика
#define ECHO_PIN 2                    // Пин эхо ультразвукового датчика

// === Настройки логирования ===
#define LOG_LEVEL 2                   // Уровень логирования: 1 - Info, 2 - Debug

// === Настройки измерений ===
#define MIN_DISTANCE_CM 10            // Минимальное расстояние для измерения (см)
#define ZONE_THRESHOLD_CM 160         // Пороговое значение зоны обнаружения (см)
#define EXIT_THRESHOLD_CM 150         // Пороговое значение зоны выхода (см)
#define REQUIRED_CONSECUTIVE_MEASUREMENTS 3 // Количество последовательных измерений для подтверждения

// === Настройки интервалов ===
#define MEASUREMENT_INTERVAL 200      // Интервал измерений в миллисекундах
#define SEND_INTERVAL 10000           // Интервал отправки данных на сервер в миллисекундах (например, 10 секунд)

// === Часовой пояс ===
#define TIME_ZONE_OFFSET 3            // Часовой пояс (например, Минск UTC+3)

// === EEPROM адреса ===
#define EEPROM_ADDR_COUNT 0
#define EEPROM_ADDR_DATE  10
#define EEPROM_ADDR_TIME  20

// === NTP настройки ===
#define NTP_SYNC_INTERVAL 3600000     // Интервал синхронизации времени с NTP сервером (миллисекунды)
#define TIME_SAVE_INTERVAL 60000      // Интервал сохранения времени в EEPROM (миллисекунды)
#define MIN_RESET_INTERVAL 43200000   // Минимальный интервал между сбросами счетчика (миллисекунды, 12 часов)
#define NTP_PACKET_SIZE 48            // Размер NTP пакета

#endif