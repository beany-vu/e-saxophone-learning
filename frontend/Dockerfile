# Dev image: the source is bind-mounted by compose, so this only needs to
# provide node plus the installed dependencies.
FROM node:26-alpine
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
