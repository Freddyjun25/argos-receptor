# Usamos una imagen ligera de Node
FROM node:18-slim

# Creamos el directorio de trabajo
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las librerías
RUN npm install

# Copiamos el resto del código
COPY . .

# Creamos la carpeta de videos para que no de error
RUN mkdir -p videos

# Exponemos el puerto que usa Koyeb
EXPOSE 8080

# Comando para arrancar
CMD ["node", "index.js"]
