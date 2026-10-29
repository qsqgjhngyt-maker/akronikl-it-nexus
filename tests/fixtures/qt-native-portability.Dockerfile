FROM nexus-m6-qt:6.8.3-ems3.1.56
USER root
RUN apt-get update && apt-get install -y --no-install-recommends libgl-dev libopengl-dev libxkbcommon-dev libegl-dev && rm -rf /var/lib/apt/lists/*
