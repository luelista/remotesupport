Ext.require([
  'Ext.grid.*',
  'Ext.window.Window',
  'Ext.container.Viewport',
  'Ext.layout.container.Border',
  'Ext.state.*',
  'Ext.data.*'
]);

Ext.onReady(function(){

  var gridView = Ext.create('Ext.grid.Panel', {
    region: 'center',
    stateful: true,
    stateId: 'stateGridExample',
    xtype: 'grid',
    columns: [{
      text: 'First Name',
      dataIndex: 'first'
    }, {
      text: 'Last Name',
      dataIndex: 'last'
    }, {
      text: 'Age',
      dataIndex: 'age'
    }, {
      flex: 1,
      text: 'Review',
      dataIndex: 'review'
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
      type: 'border',
      //padding: '5'
    },

    items: [ {
      bodyPadding: 0,
      region: 'west',
      title: 'Collapse/Width Panel',
      width: 200,
      split: true,
      collapsible: true,
      html: '<div id="newside"></div>'
    },{
      xtype: 'toolbar',
      items: [{
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
      } ],
      //bodyPadding: 0,
      region: 'north',
      //title: 'Collapse/Width Panel',
      //height: 80,
      //split: true,
      //collapsible: false,
      //html: '<div id="newheader"></div>'
    }, {
      id: 'contentArea',
      layout: 'card',
      region: 'center',
      items: [
        gridView,
        mainContentView
      ]
    }]
  });

  var contentArea = Ext.getCmp('contentArea');
  contentArea.getLayout().setActiveItem(1);

  $("#mainArea").appendTo("#newmain");
  $("#sidebar").appendTo("#newside");
  $("header").appendTo("#newheader");

});
