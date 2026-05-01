FROM node:20-alpine

WORKDIR /app

# Install build dependencies + curl for healthcheck
RUN apk add --no-cache curl openssh-client git

# Copy package files
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g pm2

# Copy app
COPY . .

# Build frontend
RUN npm run build

# Create data directories
RUN mkdir -p data ContextP

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Run with PM2
CMD ["pm2-runtime", "start", "server.ts", "--interpreter", "tsx", "--name", "saturno", "--", "--env", "NODE_ENV=production"]
