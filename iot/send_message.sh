# # scenario 1: send message with current timestamp
# mosquitto_pub -h localhost -p 1883 -q 1 \
#   -t tenants/t1/devices/d1/telemetry \
#   -m "{\"ts\":$(date +%s),\"temp\":23.4,\"hum\":45.1,\"status\":\"ok\",\"seq\":1}"

# # wait 1 second between messages to ensure different timestamps
# sleep 1

# # scenario 2: two messages with the same timestamp
# ts_date=$(date +%s)
# mosquitto_pub -h localhost -p 1883 -q 1 \
#   -t tenants/t1/devices/d1/telemetry \
#   -m "{\"ts\":$ts_date,\"temp\":24.0,\"hum\":46.0,\"status\":\"ok\",\"seq\":2}"
# mosquitto_pub -h localhost -p 1883 -q 1 \
#   -t tenants/t1/devices/d1/telemetry \
#   -m "{\"ts\":$ts_date,\"temp\":24.0,\"hum\":46.0,\"status\":\"ok\",\"seq\":2}"

# # scenario 3: send message with wrong topic
# mosquitto_pub -h localhost -p 1883 -q 1 \
#   -t tenants/t1/devices/d1/telemetry/wrong \
#   -m "{\"ts\":$(date +%s),\"temp\":25.0,\"hum\":47.0,\"status\":\"ok\",\"seq\":3}"

seq=0
temp=25.0
hum=47.0
while true; do
  ts_date=$(date +%s)
  seq=$((seq + 1))
  # randomly change temperature and humidity
  temp=$(echo "$temp + $RANDOM % 5 - 2" | bc)
  hum=$(echo "$hum + $RANDOM % 5 - 2" | bc)

  mosquitto_pub -h localhost -p 1883 -q 1 \
    -t tenants/t1/devices/d1/telemetry \
    -m "{\"ts\":$ts_date,\"temp\":$temp,\"hum\":$hum,\"status\":\"ok\",\"seq\":$seq}"

  # 20% chance to send a message with the same timestamp
  if [ $((RANDOM % 5)) -eq 0 ]; then
    mosquitto_pub -h localhost -p 1883 -q 1 \
      -t tenants/t1/devices/d1/telemetry \
      -m "{\"ts\":$ts_date,\"temp\":$temp,\"hum\":$hum,\"status\":\"ok\",\"seq\":$seq}"
  fi

  sleep 1 # wait before sending the next message
done