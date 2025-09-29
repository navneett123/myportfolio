FROM node:20-alpine

# set working dir
WORKDIR /app

# copy everything
COPY server/ .

# install deps
RUN npm install --omit=dev

# expose port
EXPOSE 3000

# run the app
CMD ["node", "index.js"]
