fs = require("fs")
pem = require("pem")
_ = require("underscore")

Plugin "read_certs", "0.0.1", (App) ->
  caKey = App.configDir + "/ca/rs-ca.key"
  caCert = App.configDir + "/ca/rs-ca.crt"
  serviceKey = fs.readFileSync(caKey)
  serviceCertificate = fs.readFileSync(caCert)

  App.on "connection", (handler) ->

    storeCSR = (info, next) ->
      handler.pendingCSR =
        commonName: info.commonName
        ou: info.organizationUnit
        modulus: info.modulus
        pem: info.pem
        remoteEndpoint: handler.hostInfo.address

      next null,
        id: handler.id


    handler.messenger["read_certs:read_ca_cert"] = (type, data, next) ->
      next err,
        caCert: serviceCertificate.toString()


    handler.messenger["read_certs:read_my_cert"] = (type, data, next) ->
      if handler.pendingCSR and handler.pendingCSR.certificate
        next err,
          cert: handler.pendingCSR.certificate.toString()

      else
        next "no signed certificate", null

    handler.messenger["read_certs:put_csr"] = (type, data, next) ->
      if data and data.pem
        (err1, info) <- pem.readCertificateInfo data.pem
        (err2, modinfo) <- pem.getModulus data.pem
        if err1 or err2
          next "" + (err1 or err2), null
          return
        console.log "modulus:", modinfo.modulus
        storeCSR _.extend(data, info, modinfo), next

      else if data and data.commonName and data.ou and data.ou isnt App.config.adminOU
        storeCSR {
          commonName: data.commonName
          ou: data.ou
          modulus: ""
          pem: ""
        }, next
      else
        next "missing parameters", null

    handler.messenger["read_certs:csr_action"] = (type, data, next) ->
      unless handler.authState is "admin"
        next "forbidden", null
        return
      target = null
      for i of app.connections
        target = app.connections[i]  if app.connections[i].id is data.id and app.connections[i].pendingCSR
      unless target?
        next "no csr found", null
        return

      switch (data.action)
      case "get"
        next null, target.pendingCSR
      case "reject"
        target.pendingCSR = null
        target.sendMessage "read_certs:on_csr_accepted", false
        next null, true
      case "accept"
        err, user <- App.db.Certificate.create(
          commonName: target.pendingCSR.commonName
          ou: target.pendingCSR.ou
        ).complete _

        if err
          next err, false
          return

        certreq = {
          csr: target.pendingCSR.pem
          serviceKey: serviceKey
          serviceCertificate: serviceCertificate
          days: 3650
          serial: 100000 + user.id
        }

        if (!certreq.csr)
          certreq.ou = target.pendingCSR.ou
          certreq.commonName = target.pendingCSR.commonName
          certreq.country = "DE"
          certreq.organization = "Teamwiki.de Remote Support"
        (err, certinfo) <- pem.createCertificate certreq
        if (err)
          next "" + (err), null
          return
        (err, fingerprint) <- pem.getFingerprint certinfo.certificate
        out =
          certificate: certinfo.certificate
          privateKey: certinfo.clientKey

        user.fingerprint = fingerprint.fingerprint
        err <- user.save().complete (err) ->
          target.pendingCSR = null
          target.sendMessage "read_certs:on_csr_accepted", out
          next err, !!err
