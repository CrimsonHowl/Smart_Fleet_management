FROM node:22-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm install

# Copy source code and build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

# Start the compiled backend server
CMD ["node", "dist/server.js"]
