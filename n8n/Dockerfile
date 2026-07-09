FROM docker:cli as docker_cli
FROM n8nio/n8n:latest
USER root
COPY --from=docker_cli /usr/local/bin/docker /usr/local/bin/docker
USER node
