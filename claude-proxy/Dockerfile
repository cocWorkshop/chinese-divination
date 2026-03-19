FROM node:24-slim

RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app
COPY server.js .

EXPOSE 8095
CMD ["node", "server.js"]
