/**
 * 
 *
 *
 *
 * 1. select WebSocket endpoint with URL
 * 2. select messaging type
 *
 * TODO:
 * + Is the top level instance created per one WebSocket, or aggregate N-Sockets?
 * + Who should manage a WebSocket instance, User or this library?
 * + API Usage
 *   var w = pisces('ws://hoge.hostname/socket');
 * + When is onmessage callback determined, lazy or on instantiation?
 *     cf. jQuery accepts ondemand callback setup.
 *         So the requirement for user is relativly low.
 *         If there is no callback, there is nothing to do when socket receive data from a server.
 * 
 */
!function (window) {

  var VERSION = '0.0.1' 
      ,
      PROTOCOL_NAME = 'wamp'
      ,
      PROTOCOL_VERSION = '1.0'
      ,
      STG_DEV = 'development'
      ,
      STG_PRD = 'production'
      ,
      MESSAGE = {
        msg_length_too_short : 'WAMP message format is invalid. Message type is not indicated.'
      }
      ;
  // FIXME: TYPE code should be referenced by spec.
  var Protocol= { 
    name : PROTOCOL_NAME
    ,
    version : PROTOCOL_VERSION
    ,
    type :  {
      welcome : 1,
      prefix : 2,
      call : 3,
      result : 4,
      error : 5,
      subscribe : 6,
      unsubscribe : 7,
      event : 8
    }
    ,
    findTypeName : function (typeCode) {
      var typeValue;
      for (typeName in Protocol.type) {
        typeValue = Protocol.type[typeName];

        if (typeCode === typeValue) {
          return typeName;
        }
      }
    }
  }

  var Welcome = function () {};

  // TODO: Temporary declaration
  var delegateProtocol = function (message) {
    // Unexpected message format
    if (message.length || message.length < 1) {
      throw MESSAGE.msg_length_too_short;
    }
    // get name of protocol type from type code; eg. 1 -> 'welcome'
    var type = message[0];
    var proto = Protocol.findTypeName(type);
    // TODO: delegate to method for each protocol
    if (proto) {
    }
  }

  /* --------------------------------------------------------------------------
   * Root of API in pisces
   * ----------------------------------------------------------------------- */
  /**
   * pisces static factory method.
   *
   * This instantiate pirsces object.
   */
  init = function (dest) {
    // if dest type is string, it's considered as url
    if (typeof dest === 'string') {
    }
    // if dest type is WebSocket, it's used directly
    else if (typeof dest === 'object') {
    }
    return new pisces(dest, {});
  };

  var pisces = function (url, option) {

  }; 

  /*
   * pisces instance method declaration
   */
  pisces.prototype = {
    // default constructor
    constructor : pisces
    ,
    // pisces version
    version : VERSION
    ,
    // indicator that represents this object is pisces
    pisces : this
    ,
    ctx : pisces.ctx
    ,
    init : function (context) {
      var url = context.url;
      // Reuse Socket if it exists
      if (!(this.ws = this.ctx.get(url))) {
        // TODO: user SocketFactory
        this.ws = new WebSocket(url, Protocol.name); 
        this.ws.open();
        // receive welcome message and save session id on local

        this.ctx.register(url, this.ws);
      }

      return this;
    }
    ,
    call : function (name, message) {
      return this.service(name).request(message);
    }
    ,
    publish : function (name, message) {}
  };



  /* --------------------------------------------------------------------------
   * Global context in one page running
   * ----------------------------------------------------------------------- */

  var Context = function() {
    // registy to cache a apened WebSocket.
    this.registry = {};
    // procedure call tracker
    this.callTracker = {};
    // topic subscription registry
    this.topicRegistry = {};
  };
  Context.prototype = {
    stage : STG_DEV // or production
    ,
    register : function (id, websocket) {
      this.registry[id] = websocket;
    }
    ,
    get : function (id) {
      return this.registry[id];
    }
    ,
    debug : function (message) {
      if (console && this.stage === STG_DEV) {
        console.debug(message);
      }
    }
    , 
    track : function (callid) {
    }
    ,
    register : function () {}

  };

  /* --------------------------------------------------------------------------
   * WebSocket Session
   * This manages state of conversation via WebSocket
   * ----------------------------------------------------------------------- */
  var Session = function (websocket) {
    this.ws = websocket;
    this.messageChain = new Chain(); 
    this.openChain = new Chain();
    this.closeChain = new Chain();
    this.errorChain = new Chain();
  };
  Session.prototype = {
    send : function (data) {
      this.ws.send(data);
    },
    onmessage : function (fn) {
      this.messageChain.add(fn);
    }
  };

  /**
   * function chain
   *
   * inspired by javax.util.chain from JSF2.0
   */
  var Chain = function() {
        this.chains = [];
  };
  Chain.prototype = {
    add : function (func) {

    }
    ,
    clear : undefined

  };

  /* --------------------------------------------------------------------------
   * Message Sender : Super class of service and topic
   * ----------------------------------------------------------------------- */
  var Producer = function() {
  };
  Producer.prototype = {
    send : function() {}
  };
 
  /* --------------------------------------------------------------------------
   * Service request client
   * ----------------------------------------------------------------------- */
  var Service = function (name) {
    this.chain = [];
    return this;
  };
  Service.prototype = {
    request : function () {
      return this.future();
    }
    ,
    future : function () {
    }
    ,
    onmessage : function (onmessage) {
      return this;
    }
    ,
    onerror : function (onerror) {
      return this;
    }
  };
  pisces.prototype.service = Service;

  /* --------------------------------------------------------------------------
   * Logger
   * ----------------------------------------------------------------------- */
  var Logger = function() {};
  Logger.prototype = {
    // regexp to tokenize placeholders binding arguments
    PLACE_HOLDER_REGEXP : /\{(\w+)\}/g
    ,
    /**
     * get current timestamp string
     */
    tstamp : function(message) {
      var now = new Date();
      return now.toLocaleDateString() + " "
        + now.toLocaleTimeString() + "."
        + now.getMilliseconds();
    }
    ,
    /**
     * bind arguments with message and format
     */
    format : function() {
      
      var tmpl = arguments[0];

      if (1 >= arguments.length) {
        return tmpl;
      }
      
      var arg = arguments[1];

      var replacer = undefined;
      
      // use name based placeholder
      if (typeof arg == "object") {
          replacer = function(m, k) { return arg[ k ]; }
      }
      // use index based placeholder
      else {
          var args = arguments;
          replacer = function(m, k) { return args[parseInt(k) + 1]; }
      }
      
      return tmpl.replace(PLACE_HOLDER_REGEXP, replacer);

    }
    ,
    log : function() {

      var now = this.tstamp();
      var level = arguments[1];

    }
    

  };

  /*
   * Set up runtime
   */
  pisces.ctx = new Context();
  window.ps = window.pisces = init;

}(window);
