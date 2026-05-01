FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080
CMD ["npx", "tsx", "server.ts"]