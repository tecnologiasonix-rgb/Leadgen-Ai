FROM node:22-alpine

# Definir el directorio de trabajo
WORKDIR /app

# Copiar configuración de dependencias
COPY package*.json ./

# Instalar TODAS las dependencias (necesitamos vite, tsx, etc. para build y start)
RUN npm install

# Copiar el resto del código
COPY . .

# Construir la parte de React (dist/)
RUN npm run build

# Exponer el puerto por el que escuchará el servidor Express
EXPOSE 3000

# Añadir variables de entorno por defecto que puedan hacer falta
ENV NODE_ENV=production
ENV PORT=3000

# Arrancar el servidor
CMD ["npm", "start"]
