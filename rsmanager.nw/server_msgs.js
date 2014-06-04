
function getSelectedHostCSR() {
  if (App.gridHosts.getSelectionModel().hasSelection()) {
     var row = App.gridHosts.getSelectionModel().getSelection()[0];
     if (row.get('pendingCSR')) {
       return row.get('id');
     }
  }
  return false;
}

function doActionOnCSR(csrid, action) {
  App.conn.sendMessage('read_certs:csr_action', { action: action, id: csrid }, function() {
    refreshHosts();
  });
}

function refreshHosts() {
  App.conn.sendMessage('admin:get_connections', '', function(err, hosts) {
    App.debug("HOSTS RECV.", err, hosts)
    var grid = Ext.getCmp('hostsGrid');
    if (hosts) grid.store.loadData(hosts);
		
  });
  App.conn.sendMessage('admin:get_hosts', '', function(err, hosts) {
    App.debug("HOSTS RECV.", err, hosts)
    var grid = Ext.getCmp('hostsGrid');
    if (hosts) grid.store.loadData(hosts);
		
  });
}


