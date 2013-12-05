!function(window, undefined) {

  var MockWebSocket = function (url, protocol) {
    this.URL = url;
    this.protocol = protocol;
    this.sendcbs = {};
  };

  MockWebSocket.prototype = {

    onopen : null,

    onclose : null,

    onerror : null,

    onmessage : null,

    send : function (json) {
      var data = JSON.parse(json);
      var _self = this;
      this.sendcbs[data[0]].call(this, data);
    },

    close : function () {
      console.log('user closed WebSocket.');
    },
    
    whenReceived : function (type, callback) {
      this.sendcbs[type] = callback;
    },

    serverSend : function (data) {
      this.onmessage(JSON.stringfy(data));
    }

  };

}(window);
