#!/bin/bash

# Minimal LiveKit server startup in dev mode
docker run --rm -p 7880:7880 -p 7881:7881 \
  livekit/livekit-server \
  --dev \
  --bind 0.0.0.0