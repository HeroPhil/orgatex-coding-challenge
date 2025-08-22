#!/bin/bash

# parse MQTT_URL from environment variable or use default
U="${MQTT_URL#*://}"              # strip scheme if present
HOSTPORT="${U%%/*}"          # drop any path/query
[ -z "$HOSTPORT" ] && HOSTPORT="$U"

HOST="${HOSTPORT%%:*}"
PORT="${HOSTPORT##*:}"
if [ "$HOST" = "$HOSTPORT" ]; then PORT="1883"; fi
[ -z "$HOST" ] && HOST="localhost"

# device setup
TENANT_ID="${TENANT_ID:-t1}"
DEVICE_ID="${DEVICE_ID:-d1}"
TOPIC="${TOPIC:-tenants/$TENANT_ID/devices/$DEVICE_ID/telemetry}"
CLIENT_ID="${CLIENT_ID:-pub-$TENANT_ID-$DEVICE_ID}"

seq=0
temp=25.0
hum=47.0
while true; do
  ts_date=$(date +%s)
  seq=$((seq + 1))

  # randomly change temperature and humidity
  temp=$(echo "$temp + $RANDOM % 5 - 2" | bc)
  hum=$(echo "$hum + $RANDOM % 5 - 2" | bc)

  mosquitto_pub -h $HOST -p $PORT -q 1 \
    -t tenants/$TENANT_ID/devices/$DEVICE_ID/telemetry \
    -m "{\"ts\":$ts_date,\"temp\":$temp,\"hum\":$hum,\"status\":\"ok\",\"seq\":$seq}"

  # 20% chance to send a message with the same timestamp
  if [ $((RANDOM % 5)) -eq 0 ]; then
    mosquitto_pub -h $HOST -p $PORT -q 1 \
      -t tenants/$TENANT_ID/devices/$DEVICE_ID/telemetry \
      -m "{\"ts\":$ts_date,\"temp\":$temp,\"hum\":$hum,\"status\":\"ok\",\"seq\":$seq}"
  fi

  sleep 1 # wait before sending the next message
done