FROM node:12

WORKDIR /app
COPY ./ /app/
COPY ./.data/ /app/.data/
COPY ./.env /app

RUN npm install -g gulp sass && \
    rm package-lock.json && \
    npm install && \
    npm run build

EXPOSE 3000

CMD ["npm", "start"]