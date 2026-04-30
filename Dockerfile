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

# Exponer el puerto predeterminado de Cloud Run
EXPOSE 8080

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=8080

# Arrancar el servidor
CMD ["npm", "start"]
