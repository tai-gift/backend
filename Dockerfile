FROM node:20-bullseye-slim

WORKDIR /backend

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]

