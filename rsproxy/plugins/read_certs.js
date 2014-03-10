var fs = require('fs'),
    pem = require('pem');

Plugin("read_certs", "0.0.1", function(App) {

  var caKey = App.configDir+"/ca/rs-ca.key";
  var caCert = App.configDir+"/ca/rs-ca.crt";

  var serviceKey = fs.readFileSync(caKey),
      serviceCertificate = fs.readFileSync(caCert);



  App.on('connection', function(handler) {
    handler.messenger["read_certs:read_ca_cert"] = function(type, data, next) {
      //fs.readFile(App.configDir+"/ca/rs-ca.crt", function(err, results) {
        next(err, { caCert: serviceCertificate.toString() });
      //});
    };

    handler.messenger["read_certs:put_csr"] = function(type, data, next) {
      if (data && data.pem) {
         pem.readCertificateInfo(data.pem, function(err1, info) {
          pem.getModulus(data.pem, function(err2, modinfo) {
            if (err1||err2) { next(""+(err1||err2), null); return; }
            console.log("modulus:",modinfo.modulus);
            storeCSR(_.extend(data, info, modinfo), next);
          });
        });
      } else if (data && data.commonName && data.ou && data.ou != App.config.adminOU) {
        storeCSR({ commonName: data.commonName, ou: data.ou, modulus: "", pem: "" }, next);
      } else {
        next("missing parameters", null);
      }
    };

    function storeCSR(info, next) {
      App.db.CSR.build({
        commonName: info.commonName,
        ou: info.organizationUnit,
        modulus: info.modulus,
        pem: info.pem,
        remoteEndpoint: handler.hostInfo.address
      }).save().complete(function(err, csr) {
        if (!!err) {
          console.log('The instance has not been saved:', err)
        } else {
          console.log('We have a persisted instance now')
        }
        next(err, { id: csr.id });
      });
    }

    handler.messenger["read_certs:get_csr"] = function(type, data, next) {
      if (handler.authState != 'admin') {
        next('forbidden', null); return;
      }
      App.db.CSR.findAll().complete(function(err, csr) {
        next(err, { csr: csr });
      });
    };

    handler.messenger["read_certs:accept_csr"] = function(type, data, next) {
      if (handler.authState != 'admin') {
        next('forbidden', null); return;
      }
      App.db.CSR.find(data.id).complete(function(err, csr) {
        if (err||(!csr)) { next(""+(err||"no csr found"), null); return; }
        var certreq = {
          csr: csr.pem,
          serviceKey: serviceKey,
          serviceCertificate: serviceCertificate,
          days: 3650,
          serial: 100000+csr.id
        };
        if (!certreq.csr) {
          certreq.ou = csr.ou; certreq.commonName = csr.commonName;
          certreq.country = "DE"; certreq.organization = "Teamwiki.de Remote Support";
        }
        pem.createCertificate(certreq, function(err, certinfo) {
          if (err) { next(""+(err), null); return; }
          csr.cert = certinfo.certificate;
          csr.privateKey = certinfo.clientKey;
          csr.save().complete(function(err) {
            next(err, !!err);
          });
        });
      });
    };



  });
});
