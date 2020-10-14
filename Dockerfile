FROM bitsler/wallet-base-node:1.0.3

USER wallet
RUN mkdir -p /wallet/app && sudo ln -s /wallet/app /usr/src
ENV APP /wallet/app
WORKDIR $APP

COPY --chown=wallet:wallet package*.json ./
COPY --chown=wallet:wallet yarn.lock ./

RUN yarn install --prod
COPY --chown=wallet:wallet . .
RUN sudo chmod +x $APP/bin/eos-cli && sudo ln -s $APP/bin/eos-cli /usr/bin/

EXPOSE 8866

CMD [ "pm2-runtime", "ecosystem.config.js" ]
