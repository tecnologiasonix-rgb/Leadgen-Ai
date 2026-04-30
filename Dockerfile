FROM node:22-alpine

# Definir el directorio de trabajo
WORKDIR /app

# Copiar configuración de dependencias
COPY package*.json ./

# Instalar dependencias (incluyendo devDependencies para el build y tsx)
RUN npm install

# Copiar el resto del código
COPY . .

# Construir la parte de React (dist/)
RUN npm run build

# Opcional: Podrías limpiar devDependencies, pero tsx las necesita para correr el servidor TS
# Si prefieres seguridad total, podrías mover tsx a dependencies en package.json

# Exponer el puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
# El puerto lo pondremos dinámico en server.ts, pero 8080 es el estándar de Cloud Run
ENV PORT=8080

# Arrancar el servidor
CMD ["npm", "start"]
