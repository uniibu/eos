FROM bitsler/wallet-base-node:1.0.3


RUN mkdir -p /home/wallet/app && ln -s /home/wallet/app /usr/src
ENV APP /home/wallet/app
WORKDIR $APP

COPY package*.json ./
COPY yarn.lock ./

RUN npm install yarn pm2 -g && yarn install --prod
COPY . .
RUN chmod +x $APP/bin/eos-cli && ln -s $APP/bin/eos-cli /usr/bin/

EXPOSE 8866

CMD [ "yarn", "start" ]
