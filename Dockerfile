FROM node:22-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

# Update Debian packages to receive available security fixes.
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Install production dependencies only.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

# Copy application files with appropriate ownership.
COPY --chown=node:node server.js ./
COPY --chown=node:node data ./data

# Run as a non-root user.
USER node

EXPOSE 5000

CMD ["node", "server.js"]
