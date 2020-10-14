FROM bitsler/wallet-base-node:1.0.3

RUN mkdir -p /wallet/app && sudo ln -s /wallet/app /usr/src
ENV APP /wallet/app
WORKDIR $APP

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --prod
COPY . .
RUN sudo chmod +x $APP/bin/eos-cli && sudo ln -s $APP/bin/eos-cli /usr/bin/

EXPOSE 8866

CMD [ "pm2-runtime", "ecosystem.config.js" ]
