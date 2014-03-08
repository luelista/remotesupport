var net = require('net'),
    tls = require('tls'),
    nssocket = require('nssocket'),
    fs = require('fs'),
    path = require('path'),
    os = require('os');

var config = require('./config');
var TunnelProtocol = require('TunnelProtocol').TunnelProtocol;

var hostIdFile = path.join(os.tmpdir(), 'hostID.txt');
if (!fs.exists(hostIdFile)) {
  fs.writeFileSync(hostIdFile, (Math.floor(Math.random() * 1000).toString(36) + (+new Date()).toString(36)).toUpperCase());
}
var randId = fs.readFileSync(hostIdFile);

console.log('hostID read from '+hostIdFile+' is: '+randId);

var tlsParams = {
  type: 'tls',
  cert: fs.readFileSync(config.serverCertFile),
  ca: fs.readFileSync(config.serverCertFile)
};
config.tlsParams = tlsParams;
var socket = new nssocket.NsSocket({
  reconnect: true,
  type: tlsParams.type,
  cert: tlsParams.cert,
  ca: tlsParams.ca,
  host: config.server,
  port: config.serverPort,
  retryInterval: 5000,
  maxRetries: 999999999,
  retryCalculateInterval: function(t, n) { return (n>10)?(t*10):t; }
});

/*
 *...scheiß
 socket.socket.cleartext.pair.on('secure', function(err) {
  console.log('secure2=',socket.socket.authorized,socket.socket.authorizationError);
  
});*/

socket.on('error', function(err) {
  console.log('🚫️   socket error:', err);
  //debugger;
});
socket.on('warning', function(err) {
  console.log('⚠️   socket warning:', err);
  //debugger;
});

socket.on('start', function () {
  console.log('Connection established');
});

socket.data(['rsvp', 'please-authenticate'], function() {
  console.log('Authenticating...');
  socket.send(['rsvp', 'login-as-client'], {
    hostInfo : {
      displayName: config.displayName,
      comment: config.comment,
      type: os.type(),
      platform: os.platform(),
      hostname: os.hostname(),
      arch: os.arch(),
      nics: os.networkInterfaces()
    }
  });
});

socket.data(['rsvp', 'error'], function(data) {
  console.log('Error received: ' + data.type + '\t' + data.reason);
});

socket.data(['rsvp', 'message'], function(data) {
  console.log('MESSAGE : ' , data.message);
});


socket.data(['rsvp', 'temp-set-config'], function(data) {
  config[data.key] = data.value;
});

TunnelProtocol(socket, config);
console.log("Connecting...");
socket.connect();


function SendHeartbeat() {
  setTimeout(SendHeartbeat, config.heartbeatInterval * 1000);
  var info = {
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem()
    };
  console.log("❤️    " + info.uptime + " - " + info.freemem);
  socket.send(['rsvp', 'heartbeat'], {
    hostInfo: info
  });
}

setTimeout(SendHeartbeat, config.heartbeatInterval * 1000);



