FROM node

WORKDIR /

COPY package.json /
COPY package-lock.json /

RUN npm install --global

WORKDIR /autocoin

#CMD ["/bin/bash"]
