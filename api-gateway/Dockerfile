# Development image: the source code is mounted from the host (see docker-compose.yml),
# so this stage only provides the Node runtime. The production stage is added in the deployment step.
FROM node:24-alpine AS dev

# The container runs as your host user, which has no home directory in the image —
# give tools (npm cache, config files) a writable home
ENV HOME=/tmp

WORKDIR /app

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
