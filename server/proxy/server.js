const cors_proxy = require('cors-anywhere');

const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 8080;

cors_proxy.createServer({originWhitelist: []}).listen(port, host, function() {console.log('Running Proxy on ' + host + ':' + port);});