Ext.require([
  'Ext.grid.*',
  'Ext.window.Window',
  'Ext.container.Viewport',
  'Ext.layout.container.Border',
  'Ext.state.*',
  'Ext.data.*'
]);

Ext.onReady(function(){
  Ext.create('Ext.data.Store', {
    storeId:'hostsStore',
    fields:['id', 'auth', 'address', 'cn', 'ou', 'self', 'pendingCSR', 'client'],
    data:[]
  });
  App.gridHosts = Ext.create('Ext.grid.Panel', {
    region: 'center', border: 0,
    id: 'hostsGrid',
    store: 'hostsStore',
    xtype: 'grid',
    columns: [{
      text: 'ID',       width: 50,      dataIndex: 'id'
    }, {
      text: 'Auth',     width: 50,      dataIndex: 'auth'
    }, {
      text: 'IP Address',               dataIndex: 'address'
    },  {
      text: 'Common Name',              dataIndex: 'cn'
    },  {
      text: 'OU',                       dataIndex: 'ou'
    },   {
      text: 'Client User Agent', width: 150, dataIndex: 'client'
    }, {
      flex: 1,
      text: 'Details',
      dataIndex: 'details',
      renderer: function(value, metaData, record) {
        console.log("details renderer", record)
        return (record.data.self  ? "[SELF] " : "") + (record.data.pendingCSR ? "[PENDING CSR]" : "");
      }
    }]
  });
  var mainContentView = Ext.create('Ext.panel.Panel', {
    id: 'mainContentView',
    region: 'center',
    padding:'10',
    autoScroll: true,
    html: '<div id="newmain"></div>'
  });
  Ext.create('Ext.container.Viewport', {
    layout: {
      type: 'border'
    },

    items: [
      {
        xtype: 'toolbar',
        items: [
          {
            text: 'Show window',
            handler: function(btn){
              Ext.create('Ext.window.Window', {
                width: 300,
                height: 300,
                x: 5,
                y: 5,
                title: 'State Window',
                maximizable: true,
                bodyPadding: 5,
                html: [
                  'some window content'
                ].join(''),
                listeners: {
                  destroy: function(){
                    btn.enable();
                  }
                }
              }).show();
              btn.disable();
            }
          }, {
            text: 'Shell connection',
            handler: function() {
              onOpenShellConnection();
            }
          }, {
            text: 'VNC Connection',
            handler: function() {
              onOpenVncConnection();
            }
          }, {
            text: 'Refresh', iconCls: 'icon-loop2',
            handler: function() {
              refreshHosts();
            }
          } , {
            tooltip: 'debug', iconCls: 'icon-bug',
            handler: function() {
              require('nw.gui').Window.get().showDevTools()
            }
          } 
        ],
        //bodyPadding: 0,
        region: 'north',
        //title: 'Collapse/Width Panel',
        //height: 80,
        //split: true,
        //collapsible: false,
        //html: '<div id="newheader"></div>'
      }, {
        layout: { type: 'border' }, region: 'center', padding: 5, border: 0,
        items: [
          {
            bodyPadding: 0,
            region: 'west',
            title: 'Menu',
            width: 200,
            split: true,
            collapsible: true,
            //html: '<div id="newside"></div>'
            xtype: 'treepanel',
            rootVisible: false,
            store: new Ext.data.TreeStore({
              root: {expanded:true,children:[
                {text:"All Connections", leaf: true},
                {text:"Host Configuration", leaf: true},
                {text:"Admins", leaf: true},
                {text:"Running Commands", childred: []}
              ]}
            })
          }, {
            id: 'contentArea',
            layout: 'card',
            region: 'center',
            items: [
              App.gridHosts,
              mainContentView
            ]
          }, {
            id: 'Console',
            region: 'south',
            title: 'Console',
            height: 200,
            split: true,
            collapsible: true,
            autoScroll: true,
            html: '<div id="debugout"></div>'
          }
        ]
      }
    ]
  });

  App.contentArea = Ext.getCmp('contentArea');
  App.contentArea.getLayout().setActiveItem(0);

  $("#mainArea").appendTo("#newmain");
  $("header").appendTo("#newheader");
  
  Ext.getCmp('Console').body.dom.style.backgroundColor = '#333';

});
