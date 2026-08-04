const http = require('http');
const { handleRequest } = require('./lib/app');

const PORT = process.env.PORT || 3000;

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Portail client lancé sur http://localhost:${PORT}`);
});
