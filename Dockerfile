FROM node:25-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build web app
RUN pnpm build:web

# Expose port
EXPOSE 3847

# Start server
ENV NODE_ENV=production
CMD ["npx", "tsx", "-e", "import { config } from 'dotenv'; config({ path: '.env.local', override: true }); import { startServer } from './src/lib/server/index.js'; startServer(3847);"]
