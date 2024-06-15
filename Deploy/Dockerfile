FROM node:20-alpine as development

WORKDIR /usr/app

COPY package*.json .

RUN npm install

COPY . .

RUN npm run build

FROM ubuntu:focal as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get update -y
RUN apt-get install -y nodejs

RUN apt-get install git -y

WORKDIR /usr/app
# Copy built files from development stage
COPY --from=development /usr/app/dist ./dist
COPY main.sh /usr/app/main.sh
COPY package*.json .

RUN npm install


RUN chmod +x /usr/app/main.sh

ENTRYPOINT ["/usr/app/main.sh"]