FROM node:12.13-slim

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

RUN npm install yarn pm2 -g && yarn install --prod
COPY . .
RUN chmod +x /usr/src/app/bin/eos-cli && ln -s /usr/src/app/bin/eos-cli /usr/bin/

EXPOSE 8866

CMD [ "yarn", "start" ]