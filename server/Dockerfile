FROM node:boron

# Create app directory
RUN mkdir -p /usr/src/apmt
WORKDIR /usr/src/apmt

# Install app dependencies
COPY package.json /usr/src/apmt/
RUN npm install
# Bundle app source
COPY . /usr/src/apmt

EXPOSE 3000

CMD [ "node", "index.js"]

