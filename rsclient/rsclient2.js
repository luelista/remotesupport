#!/usr/bin/env node

var net = require('net'),
    MultiplexStream = require('multiplex-stream'),
    tls = require('tls'),
    fs = require('fs'),
    rsproto = require('rsproto'),
    readline = require('readline');
var Netmask = require('netmask').Netmask;

var configDir = process.env.RS_DIR || "/tmp/rs";
var config = rsproto.loadConfig(configDir + '/config.json');

var serverHost = process.env.RS_HOST || config.proxy_host || "127.0.0.1";
var serverPort = process.env.RS_PORT || config.proxy_port || 4711;

var args = process.argv.slice(2);
var conn = null;

var CERT_PATH = configDir+"/rsclient.crt";
var CERT_KEY_PATH = configDir+"/rsclient.key";

function connect() {
  var crtPath = (!fs.existsSync(CERT_PATH)) ? null : CERT_PATH;
    var keyPath = (!fs.existsSync(CERT_KEY_PATH)) ? null : CERT_KEY_PATH;
  var caCertPath = configDir+"/rsctl-ca.crt";
  if (!fs.existsSync(caCertPath)) caCertPath = null;
  conn = new rsproto(serverHost, serverPort, 'rsclient', false, keyPath, crtPath, caCertPath);
  conn.on('connected', function() {
  })
}


function generateKeys() {
  var csr = {
    ou: 'Remote Support Host',
    commonName: 'some host'
  };

  conn.on("connected", function() {
    conn.sendMessage("read_certs:put_csr", csr, function(err, putres) {
      if (err) console.log("ERROR: Unable to put key and cert request on server. ",err);
      else console.log("OK: key and cert request sent to server as #"+putres.id+"\nyou might want to do this as admin now:\n  rsctl mancsr "+putres.id);

      conn.once("msg:read_certs:on_csr_accepted", function(accept) {
        if (accept) {
          console.log("Your CSR was accepted. This host is now registered.");
          fs.writeFileSync(CERT_KEY_PATH, accept.privateKey);
          fs.writeFileSync(CERT_PATH, accept.certificate);
          console.log("certificate written to "+CERT_PATH);
        } else {
          console.log("Your CSR was rejected.");
        }
        conn.close();
      })
    });
  });

}

connect();

if (!fs.existsSync(CERT_PATH)) generateKeys();

conn.on('connected', function() {
  conn.sendMessage('hello:who_am_i', '', function(err, data) {
    if (err)  console.log("ERROR:",err);
    else console.log("Registered as Client #"+data.id+", Auth Type '"+data.auth+"'")
  });
})

//console.log("listening to server...");
