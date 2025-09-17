FROM postman/newman:alpine

# Necesario para node-gyp y dependencias nativas
RUN apk add --no-cache --virtual .gyp python3 make g++

# Instalar el reporter HTML
RUN npm install -g newman-reporter-html
