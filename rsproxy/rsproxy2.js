var net = require('net'),
    MultiplexStream = require('multiplex-stream'),
    tls = require('tls'),
    fs = require('fs'),
    events = require('events');
var Netmask = require('netmask').Netmask;

function App() {
}
App.prototype = new events.EventEmitter();

var app = new App();
global.app = app;

app.configDir = process.env.RS_DIR || "/tmp/rs";
app.config = require(app.configDir+'/rs-server-config');
if(app.config.adminNetmask) app.config.adminNetmask = new Netmask(app.config.adminNetmask);

app.db = require('./database')

app.plugins = [];
global.Plugin = function(name, ver, onInit) {
  app.plugins.push({ name: name, ver: ver, onInit: onInit });
};
App.prototype.runPlugins = function(){
  for(var i in this.plugins) {
    this.plugins[i].onInit(this);
  }
}
fs.readdirSync("./plugins").forEach(function(file) {
  require("./plugins/" + file);
});

app.connections = [];
app.idCounter = 1;
app.seqCounter = 1;

app.tls_options = {
    key: fs.readFileSync(app.configDir+'/rs-server.key'),
    cert: fs.readFileSync(app.configDir+'/rs-server.crt'),

    // This is necessary only if using the client certificate authentication.
    requestCert: true,

    // This is necessary only if the client uses the self-signed certificate.
    ca: [ fs.readFileSync(app.configDir+'/ca/rs-ca.crt') ]
};

app.multiplex_options = {
    // The connectTimeout optionally specifies how long to
    // wait in milliseconds for the downstream multiplex to
    // accept connections. It defaults to 3000 milliseconds
    connectTimeout: 5000
};

var ClientHandler = function(cleartextStream) {
    var self = this;
    this.cleartextStream = cleartextStream;
    this.id = app.idCounter++; // TODO: make up more complicated id
    this.authState = '';
    this.hostInfo = {};
    if (cleartextStream.authorized) {
      this.cert = cleartextStream.getPeerCertificate();
      this.authState = (this.cert.subject.OU === app.config.adminOU) ? 'admin' : 'host';
      this.hostInfo.cn = this.cert.subject.CN;
      this.hostInfo.email = this.cert.subject.EMAIL;
    }
    this.hostInfo.address = cleartextStream.remoteAddress;
    this.hostInfo.connectionTimestamp = +new Date();
    this.sequenceCallback = {};
    this.messenger = {};
    var downstreamMultiplex = new MultiplexStream(app.multiplex_options, function(downstreamConnection) {
        self.onMultiplexConnection(downstreamConnection);
    });
    cleartextStream.pipe(downstreamMultiplex).pipe(cleartextStream);
    cleartextStream.on('close', function() {
      var index = app.connections.indexOf(this);
      if (index > -1) app.connections.splice(index, 1);
    }.bind(this));
}
ClientHandler.prototype = new events.EventEmitter();
ClientHandler.prototype.onControlConnection =
  require('rsproto/jsonCtrlMessage').onControlConnection;

ClientHandler.prototype.onMultiplexConnection = function(connection) {
  // a multiplexed stream has connected from upstream.
  // The assigned id will be accessible as downstreamConnection.id
  switch(connection.id) {
  case "\"ctrl":
    this.controlConnection = connection;
    this.onControlConnection(connection);
    break;
  }
}

ClientHandler.prototype.sendMessage = function(mtype, data, callback) {
  var seqnum = null;
  if (callback) {
    seqnum = app.seqCounter++;
    this.sequenceCallback[seqnum] = callback;
  }
  this.controlConnection.write(JSON.stringify([seqnum, null, mtype, data])+"\n");
}

// run server
tls.createServer(app.tls_options, function (cleartextStream) {
    console.log('Connection...');
    var handler = new ClientHandler(cleartextStream);
    app.connections.push(handler);
    app.emit('connection', handler);
}).listen(app.config.serverPort)
.on('clientError', function(err, pair) {
  console.log("clientError", err);
});

app.runPlugins();

console.log("Listening on port "+app.config.serverPort+" ...");
