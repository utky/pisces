!function (window, undefined) {

  /*
   * Define constants
   */
  var VERSION = '0.0.1' 
      ,
      STG_DEV = 'development'
      ,
      STG_PRD = 'production'
      ,
      MESSAGE = {
        MSG_LENGTH_TOO_SHORT : 'WAMP message format is invalid. Message type is not indicated.'
        ,
        INVALID_PISCES_OPTIONS_TYPE : 'pisces constructor needs an argument that type is string or object but entered : {0}'
        ,
        UNSUPPORTED_MESSAGE_TYPE : 'found unsupported wamp WAMP message type: {0}'
      }
      ;

  /* --------------------------------------------------------------------------
   * Root of API in pisces
   * ----------------------------------------------------------------------- */
  /**
   * pisces static factory method.
   */
  pisces = function () {
    return createPisces.apply(window, arguments);
  };

  pisces.MESSAGE = MESSAGE;

  /**
   * Object copy utility
   *
   */
  pisces.copy = function copy(dst, src) {
    dst = dst || {};
    if (!src) {
      return dst;
    }
    for (name in src) {
      var srcProp = src[name];
      // prevent forever loop
      if (dst.hasOwnProperty(name) 
          && dst[name] === src[name]) {
        continue;
      }

      if (typeof srcProp === 'undefined' || srcProp == null) {
        continue;
      }

      dst[name] = srcProp;
    }
    return dst;
  };

  /**
   * Class definition
   * this.init method works as constructor
   */
  var buildingClass = false;
  pisces.Class = function Class() {

    var args = pisces.args(arguments);

    if (typeof args[0] === 'function') {
      var superClass = args.shift();
    }

    var clazz = function Class() {
      if (!buildingClass && this.init) {
        this.init.apply(this, arguments);
      }
    };

    // Super class inheritance
    if (superClass) {
      buildingClass = true;
      var newProto = new superClass();
      buildingClass = false;
      clazz.prototype = newProto;
    }

    var proto = clazz.prototype;

    // Subclass override (multiple)
    for (var i = 0; i < args.length; i++) {
      var properties = args[i];
      // if arguments aren't plain object, ignore copying
      if (typeof properties !== 'object') {
        continue;
      }
      pisces.copy(proto, args[i]);
    }

    proto.constructor = clazz;

    return clazz;
  };

  /**
   * enable inheritance of Class
   */
  pisces.extend = function extend(clazz, prop) {
    return pisces.Class(clazz, prop);
  };

  /**
   * arguments slicer
   */
  pisces.args = function (args) {
    return [].slice.apply(args);
  }

  /*
   * factory method for creation pisces object
   */
  function createPisces(options) {
    var id = '';
    if (typeof options === 'string') {
      id = options;
    }
    // resuse instance if id option specified
    if (id) {
      return pisces.ctx.cache(id);
    }
    // or create new pisces instance
    return new Pisces(options);
  };

  /**
   * pisces constructor
   *
   * ## options
   *   url :: string -> URL to establish WebSocket connection (Required if ws missing)
   *   ws :: WebSocket -> Established WebSocket to delegate transport (Required if url missing)
   *   id :: string -> Identifier of this object (Optional)
   */
  var Pisces = pisces.Class({

    init : function (options) {

      this.ctx = pisces.ctx;

      if (typeof options !== 'object') {
        this.ctx.error(pisces.MESSAGE.INVALID_PISCES_OPTIONS_TYPE, (typeof options));
        // TODO: message
        throw 'parameter object is not object type';
      }

      // save options in local
      this.opt = options;

      // save or generate id of this pisces
      if (!this.opt.id) {
        this.id = this.ctx.generatePsId();
      }
      else {
        this.id = this.opt.id
      }

      // Message Endpoint cache
      this.procs = {};
      this.topics = {};

      // Prefix configuration cache
      this.prefs = {};

      // push this instance as the cache in Context
      this.ctx.cache(this);

      // if dest type is string, it's considered as url
      var ws;
      if (this.opt.url) {
        ws = this.ctx.createWebSocket(this.opt.url);
      }
      // if dest type is WebSocket, it's used directly
      else if (this.opt.ws) {
        ws = ws;
      }

      // instantiate WebSocket session
      this.ses = new Session(ws);
      // instantiate bi-di channel of event transfer
      this.channel = this.ctx.createEventChannel(this.ses);

      // open websocket and receive welcome message to get session id given by the server
      this.ses.open(this.channel);

      return this;
    }, 
    // pisces version
    version : VERSION
    ,
    // indicator that represents this object is pisces
    pisces : VERSION
    ,
    // pisces context reference
    ctx : pisces.ctx
    ,
    /**
     * get procedure with specified name
     * procedure name should formatted as URI or CURIE
     */
    proc : function(name) {
      // TODO: refer prefix mapping to enable spcifying abbr and full uri either
      // use the instance from cache first
      var proc = this.procs[name];
      if (!proc) {
        proc = this.procs[name] = new Procedure({
          channel : this.channel,
          name : name});
      }
      return proc;
    }
    ,
    /**
     * get topic with specified name
     * topic name should formatted as URI or CURIE
     */
    topic : function(name) {
      // TODO: refer prefix mapping
      var topic = this.topics[name];
      if (!topic) {
        topic = this.topics[name] = new Topic({
          channel : this.channel,
          name : name});
      }
      return topic;
    }
    ,
    /**
     * send prefix information to the server
     * 
     * usage:
     * prefix({
     *   "nameA" : "http://hostname.com/websocket/endpoint",
     *   "nameB" : "http://hosthame.com/WebSocket/anotherendpoint"
     *   });
     */
    prefix : function (targets) {

      // request the server to register prefix sequentially each of targets props
      for (pref in targets) {
        var msg = pisces.message('prefix', 
          {prefix : pref,
           url : targets[pref]});
        this.channel.send(msg);
      }
      // update and overwrite prefix cache
      this.prefs = pisces.copy(this.prefs, targets);
      return this;
    }
    
  });

  /* --------------------------------------------------------------------------
   * Global context in one page running
   * ----------------------------------------------------------------------- */
  var Context = pisces.Class({

    init : function() {

      // pisces instance cache
      this.caches = {};
      // global logger
      this.logger = new pisces.Logger(this);
      // attribute map of this context
      this.attrs = {};

      this.stage = STG_DEV;
    },

    /**
     * pisces instance cache accessor
     * 
     * @param target pisces object to save or id string to get instnace from cache
     * @return target pisces object
     */
    cache : function (target) {
      if (typeof target === 'string') {
        return this.caches[target];
      }
      else if (target && target.pisces) {
        this.caches[target.id] = target;
        return target;
      }
    }
    ,
    /**
     * Context attribute accessor
     * @param name Attribute name
     * @param value Attribute value bound with name
     * @return value
     */
    attr : function (name, value) {
      // setter
      if (value) {
        this.attrs[name] = value;
        return value;
      }
      // value is missing -> get property
      else {
        return this.attrs.hasOwnProperty(name) ? this.attrs[name] : undefined;
      }
    }
    ,
    debug : function () {
      if (this.stage === STG_DEV) {
        this.logger.debug.apply(this.logger, arguments);
      }
    }
    ,
    error : function () {
      this.logger.error.apply(this.logger, arguments);
    }
    ,
    /**
     * generate id of pisces instance
     * this id can identify on this document namespace
     */
    generatePsId : function () {
      return 'ps-' + new Date().getTime();
    }
    ,
    createEventChannel : function (session) {
      return new EventChannel(session);
    }
    ,
    createWebSocket : function (url) {
      return new WebSocket(url, pisces.Protocol.name); 
    }
    
  });

  /* --------------------------------------------------------------------------
   * Channel of event bus
   * ----------------------------------------------------------------------- */
  /**
   * EventCHannel controls routing message propagation
   */
  var EventChannel = pisces.Class({

    /**
     * Create Channel with existing Session
     */
    init : function (session) {
      this.ses = session;
      this.chains = {};
    }
    ,
    /*
     * handle outgoing message to server
     */
    send : function (message) {
      if (this.ses.id) {
        pisces.ctx.error('session has not been identified by server yet. abort processing.');
        return;
      }

      this.session.send(message);
    }
    ,
    /*
     * handle incoming message from server
     *
     */
    receive : function (message) {

      var typeName = pisces.Protocol.findTypeName(message.type);

      var id = (function (message) {
        if (message.topicURI) {
          return message.topicURI;
        }
      })(message);

      var eventId = typeName + (id ? '.' + id : '');

      var chain = this.chains[eventId];

      chain.run(message);
    }
    ,
    on : function (eventId, handler) {

      var eventName = this._getEventName(eventId);

      var chain = this.chains[evendId];

      if (!chain) {
        chain = new Chain();
        this.chains[eventId] = chain;
      }
      chain.add(handler);
      return this;
    }
    ,
    off : function (eventId) {
      var eventName = this._getEventName(eventId);
      var chain = this.chains[eventName];
      chain.remove(eventId);
      return this;
    }
    ,
    /* 
     * (private)
     * get the event name formatted like jQuery event namespace
     */
    _getEventName : function (eventId) {
       var evindex = eventId.indexOf('.');
       var eventName = eventId;
       if (evindex > 0) {
         eventName = eventId.substr(0, evindex);
       }
       return eventName;
    } 
  });
 

  /* --------------------------------------------------------------------------
   * IO abstraction static method utilities
   * ----------------------------------------------------------------------- */
  var IO = {
    /**
     * serialize object to json format
     */
    ser : function (object) {
      return JSON.stringfy(object);
    }
    ,
    /**
     * deserialize json to object literal
     */
    des : function (jsonString) {
      return JSON.parse(jsonString);
    }
  };
 
  /* --------------------------------------------------------------------------
   * Message format converter
   * ----------------------------------------------------------------------- */
  var MessageConverter = pisces.Class({

    init: function () {
    }
    ,
    convertJSON : function (message) {
      return IO.ser(message.serialize());
    }
    ,
    convertObject : function (frame) {
      var frameArray = IO.des(frame);

     // Unexpected message format
      if (!frameArray || frameArray.length || frameArray.length < 1) {
        pisces.ctx.error(pisces.MESSAGE.MSG_LENGTH_TOO_SHORT);
        return;
      }
      // get name of protocol type from type code; eg. 0 -> 'welcome'
      var type = frameArray[0];
      var protoName = pisces.Protocol.findTypeName(type);
      if (!protoName) {
        pisces.ctx.error(pisces.MESSAGE.UNSUPPORTED_MESSAGE_TYPE);
        return;
      }
      return pisces.message(protoName, frameArray);
    }
  });
  /* --------------------------------------------------------------------------
   * WebSocket Session
   * This manages state of conversation via WebSocket
   * ----------------------------------------------------------------------- */
  var Session = pisces.Class({

    init : function (websocket) {
      // WebSocket corresponding this session
      this.ws = websocket;

      // the tracker of each calling procedure (key: callId, value: status)
      this.callTracker = {};

      this.converter = new MessageConverter();
    }
    ,
    open : function (channel) {
      this.setChannel(channel);

      /*
       * first, open websocket and recerive WELCOME message from the server
       * to save session id on local
       */
      var _session = this;
      this.ch.on('welcome.init', function (message) {
        // register session id and misc info
        _session.id = message.sessionId;
        _session.serverIdent = message.serverIdent;
      });
      
      this.ws.open();
    }
    ,
    send : function (msgObj) {
      var jsonframe = this.converter.convertJSON(msgObj);

      pisces.ctx.debug('message sent. content : {0}', jsonframe);

      this.ws.send(jsonframe);
      return this;
    }
    ,
    setChannel : function (channel) {
      var _ch = this.ch = channel;

      // bind channel to websocket#onmessage
      this.ws.onmessage = function (frame) {

        pisces.ctx.debug('message received. content : {0}', frame);

        var fn = _ch.receive;

        var data = this.converter.convertObject(frame);

        fn.call(_ch, data);
      }
    }
    
  });

  /**
   * function chain
   *
   * inspired by javax.util.chain from JSF2.0
   */
  var Chain = pisces.Class({

    init : function() {
      this.chains = {};
    }
    ,
    add : function (fn, name) {

      name = name || 'anonymous';

      var fnArray;
      if (!this.chains.hasOwnProperty(name)) {
        fnArray = [];
        this.chains[name] = fnArray;
      }
      fnArray = this.chains[name];

      fnArray.push(fn);

      return fn;
    }
    ,
    remove : function (name) {
      this.chains[name] = undefined;
    }
    ,
    clear : function () {
      this.chains = {};
    }
    ,
    run : function (data) {
      for (name in this.chains) {
        var fnArray = this.chains.hasOwnProperty(name) ? this.chains[name] : [];
        for (var i = 0 ; i < fnArray.length ; i++) {
          var fn = fnArray[i];
          // TODO: thisArg is window. Is this correct?
          var ret = fn.call(window, data);
          // if boolean false was returned, abort processing.
          if (typeof ret === 'boolean' && !ret) {
            return;
          }
        }
      }
    }

  });

  /* --------------------------------------------------------------------------
   * WAMP message endpoint : Super class of Procedure and Topic
   * ----------------------------------------------------------------------- */
  var Endpoint = pisces.Class({
    init : function(config) {
      this.channel = config.channel;
      this.name = config.name; 
    }
    ,
    send : function() {}
  });
 
  /* --------------------------------------------------------------------------
   * Procedure client
   * ----------------------------------------------------------------------- */
  var Procedure = pisces.Class(Endpoint, {

    /**
     * @param data
     * @param onresult
     * @param onerror
     */
    send : function (data, onresult, onerror) {
      var msg = pisces.message('call', 
        {procURI : this.name,
          parameters : data});

      // TODO: register onresult and onerror as the temporary callback in this calling

      this.channel.send(msg);      
      
    }
    ,
    future : function () {
      return {};
    }
    ,
    onresult : function (onresult) {
      this.channel.on('callresult', onresult);
      return this;
    }
    ,
    onerror : function (onerror) {
      this.channel.on('callerror', onerror);
      return this;
    }
  });

  var Topic = pisces.Class(Endpoint, {
    send : function () {
      var msg = pisces.message('publish', 
        {topicURI : this.name,
          event : arguments[0]});

      this.channel.send(msg);
    }
    ,
    subscribe : function () {
      var msg = pisces.message('subscribe', 
        {topicURI : this.name});

      this.channel.send(msg);

      return this;
    }
    ,
    unsubscribe : function () {
      var msg = pisces.message('unsubscribe', 
        {topicURI : this.name});

      this.channel.send(msg);

      return this;
    }
    ,
    onevent : function (onevent) {
      this.channel.on('event.' + this.name, onevent);
      return this;
    }
  });

  /**
   * onload utility
   */
  onload = function (f) {
    // for W3C DOM
    if (window.addEventListener) { 
      window.addEventListener("load", f, false);
    } 
    // for IE
    else if (window.attachEvent) { 
      window.attachEvent("onload", f);
    } 
    // otherwise
    else  {
      window.onload = f;
    }
  };

  /*
   * Create Context bound with pisces namespace on page loading
   * This means that Context would be refered by one or more pisces instances
   */
  onload(function () {
    pisces.ctx = new Context();
  });
  
  /*
   * expose pisces factory method 
   */
  window.ps = window.pisces = pisces;

}(window);
