FROM node:18-bullseye-slim
WORKDIR /app

# Copy manifests first for layer caching
COPY package.json ./
COPY server/package.json ./server/package.json

# Copy rest of the project
COPY . /app

WORKDIR /app/server

# Ensure we don't keep host's node_modules and install build tools to compile native modules
RUN rm -rf node_modules package-lock.json || true
RUN apt-get update && apt-get install -y python3 build-essential make g++ ca-certificates --no-install-recommends \
	&& npm install --production \
	&& apt-get remove -y python3 build-essential make g++ \
	&& apt-get autoremove -y \
	&& rm -rf /var/lib/apt/lists/*

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:3000/health || exit 1
CMD ["node","index.js"]
