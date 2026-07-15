FROM node:22-alpine

RUN apk upgrade --no-cache && \
    apk add --no-cache wget

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

EXPOSE 3001

CMD ["npm", "start"]
