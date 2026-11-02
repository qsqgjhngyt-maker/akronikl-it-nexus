FROM debian:bookworm-slim@sha256:99c0b25c46d0214d5a2091092e7908907dcaecd6a962cde0ac700acee222b6f3
RUN apt-get update && apt-get install -y --no-install-recommends libicu72 libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY engine/ /opt/onescript/
RUN chmod 0555 /opt/onescript/bin/oscript && chmod -R a+rX /opt/onescript
ENV HOME=/tmp DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1
WORKDIR /tmp
USER 65532:65532
ENTRYPOINT ["/opt/onescript/bin/oscript"]
