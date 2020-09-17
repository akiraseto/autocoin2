FROM node

WORKDIR /autocoin2

COPY package.json .
COPY package-lock.json .

RUN npm install

CMD node autocoin/app.js
