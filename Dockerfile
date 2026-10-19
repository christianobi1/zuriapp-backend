FROM node:22-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

# Apply available Debian security updates.
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Install production dependencies only.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

# Remove unused package-management tools from the runtime image.
RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /opt/yarn-v1.22.22 \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack \
    /usr/local/bin/yarn \
    /usr/local/bin/yarnpkg

# Copy application files with appropriate ownership.
COPY --chown=node:node server.js ./
COPY --chown=node:node data ./data

# Run as a non-root user.
USER node

EXPOSE 5000

CMD ["node", "server.js"]
