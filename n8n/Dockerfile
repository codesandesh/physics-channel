FROM docker:cli as docker_cli
FROM docker.n8n.io/n8nio/n8n:latest
USER root
COPY --from=docker_cli /usr/local/bin/docker /usr/local/bin/docker
USER node
