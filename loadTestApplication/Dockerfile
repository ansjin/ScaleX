FROM node:boron

# Create app directory
RUN mkdir -p /usr/src/load-test
WORKDIR /usr/src/load-test

# Install app dependencies
COPY package.json /usr/src/load-test/
RUN npm install
# Bundle app source
COPY . /usr/src/load-test

EXPOSE 3002

CMD [ "node", "index.js"]

