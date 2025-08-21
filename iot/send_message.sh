mosquitto_pub -h localhost -p 1883 -q 1 \
  -t tenants/t1/devices/d1/telemetry \
  -m "{\"ts\":$(date +%s%3),\"temp\":23.4,\"hum\":45.1,\"status\":\"ok\",\"seq\":1}"