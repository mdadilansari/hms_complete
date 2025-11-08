#!/bin/sh
# wait-for-it.sh: Wait until a host:port is available
# Usage: wait-for-it.sh host:port [--timeout=seconds] [--strict] [-- command args]

HOST=$(echo $1 | cut -d: -f1)
PORT=$(echo $1 | cut -d: -f2)
TIMEOUT=30
STRICT=0
shift

while [ "$1" != "" ]; do
  case $1 in
    --timeout=*) TIMEOUT="${1#*=}" ;;
    --strict) STRICT=1 ;;
    --) shift; break ;;
  esac
  shift
done

for i in $(seq 1 $TIMEOUT); do
  nc -z $HOST $PORT && exit 0
  sleep 1
done

if [ "$STRICT" -eq 1 ]; then
  echo "Timeout waiting for $HOST:$PORT" >&2
  exit 1
else
  echo "Timeout waiting for $HOST:$PORT, continuing anyway" >&2
fi
