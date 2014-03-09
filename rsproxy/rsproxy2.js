var net = require('net'),
    MultiplexStream = require('multiplex-stream'),
    tls = require('tls'),
    fs = require('fs');
var Netmask = require('netmask').Netmask;

var config = require('./config');
if(config.adminNetmask) config.adminNetmask = new Netmask(config.adminNetmask);

var connections = [];
var idCounter = 1;

var tls_options = {
  key: fs.readFileSync(config.serverCertFile),
  cert: fs.readFileSync(config.serverKeyFile),

  // This is necessary only if using the client certificate authentication.
  requestCert: true,

  // This is necessary only if the client uses the self-signed certificate.
  ca: [  ]
};

var multiplex_options = {
  // The connectTimeout optionally specifies how long to
  // wait in milliseconds for the downstream multiplex to
  // accept connections. It defaults to 3000 milliseconds
  connectTimeout: 5000
};

// messaging server
tls.createServer(tls_options, function (cleartextStream) {
  var downstreamMultiplex = new MultiplexStream(multiplex_options, function(downstreamConnection) {
  // a multiplexed stream has connected from upstream.
  // The assigned id will be accessible as downstreamConnection.id
  downstreamConnection.setEncoding();
  downstreamConnection.on('data', function(data) {
    // received data, send reply upstream
    downstreamConnection.write('Hello, upstream');
  });
  downstreamConnection.on('end', function(data) {
    // downstream connection has ended
  });
  });
  var unauthenticated = true;
  socket.authState = '';
  socket.hostInfo = {};
  socket.hostInfo.address = socket.socket.remoteAddress;
  socket.hostInfo.connectionTimestamp = Timestamp();
  socket.id = idCounter++; // TODO: make up more complicated id
  connections.push(socket);
  console.log('Connection...');


