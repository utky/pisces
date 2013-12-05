/*
 * pisces protocol specific interfaces
 */
!function (window, undefined) {

  var PROTOCOL_NAME = 'wamp'
      ,
      PROTOCOL_VERSION = 1
      ,
      DEFAULT_RANDOM_SOURCE = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
      ;

  /*
   * instantiate all protocol type class
   *
   * namespace has constructed as following
   * 
   * protocol
   *   type
   *     welcome
   *     prefix
   *     call
   *     ...
   */
  var Protocol = {
    init : function() {
      var types = this.type;
      for (typeClass in Protocol.Type) {
        if (Protocol.Type.hasOwnProperty(typeClass)) {
          var name = typeClass.toLowerCase();
          types[name] = Protocol.Type[typeClass]();
        }
      }
    }
    ,
    name : PROTOCOL_NAME
    ,
    version : PROTOCOL_VERSION
    ,
    type : {}
    ,
    newCallId : function () {
      this.random = this.random || new Random();
      return this.random.generate();
    }
    ,
    findTypeName : function (code) {
      var t = this.Type
      for (name in t) {
        var proto = t[name].prototype;
        if (proto && proto.type && proto.type === code) {
          return name.toLowerCase();
        }
      }
    }
    
  };

  var Random = function() {
    this.config = {
      source : DEFAULT_RANDOM_SOURCE
        ,
      seed : 0
        ,
      length : 16
    };
  };
  Random.prototype = {
    /**
     * generate random string as specified length
     * @param length :: integer -> length of generated random string
     */
    generate : function (length, seed) {

      length = length || this.config.length;
      seed = seed || this.config.seed;

      var result = '';

      for (var i = 0; i < length; i++) {

        var index = Math.floor(Math.random() * this.config.source.length);

        result += this.config.source.substring(index, index + 1);
      }
      return result;
    }
  };
  window.pisces.Random = Random;

  var Type = pisces.Class({
    
  });
  Protocol.Type = Type;

  var Message = pisces.Class(Type, {
    _desWithFormat : function (data, frameFormat) {
      var obj = {};
      
      for (var i = 0 ; i < array.length ; i++) {
        var value = array[i];
        var name = frameFormat[i];
        obj[name] = value;
      }

      return obj;
    }
    ,
    _serWithFormat : function (obj, frameFormat) {

      var frame = new Array();
      for (var i = 0 ; i < this.frameFormat.length ; i++) {
        var name = frameFormat[i];
        var value = obj[name];
        frame.push(value);
      }
      return frame;
    }
  });

  /**
   * Message components factory method
   */
  Message.create = function () {
    var args = pisces.args(arguments);
    var type = args[0];
    type = type.charAt(0).toUpperCase() + type.slice(1);

    var ctor = Type[type];
    return ctor.apply(ctor, args.slice(1));
  };
  pisces.message = Message.create;

  /**
   * A class represents a incoming message
   */
  var InboundMessage = pisces.Class(Message, {
    init : function (frame) {
      pisces.copy(this, this.deserialize(frame));
    }
    ,
    /**
     * Deserialize WAMP frame and convert it to PlainObject
     *
     * to be overridden
     */
    deserialize : function (frame) {}
  });

  /**
   * A class represents a outgoing message
   */
  var OutboundMessage = pisces.Class(Message, {
    init : function (properties) {
      pisces.copy(this, properties);
    }
    ,
    /**
     * Serialize WAMP message and convert it to Array object
     *
     * to be overridden
     */  
    serialize : function () {}
  });

  /**
   * Welcome message
   */
  var Welcome = pisces.Class(InboundMessage, {
    type : 0,
    frameFormat : [
    'type',
    'sessionId',
    'protocolVersion',
    'serverIdent'
    ]
    ,
    deserialize : function (frame) {
      return this._desWithFormat(frame, this.frameFormat);
    }

  });
  Type.Welcome = Welcome;

  /**
   * Prefix message
   */
  var Prefix = pisces.Class(OutboundMessage, {
    type : 1,
    frameFormat : [
    'type',
    'prefix',
    'uri'
    ],
    serialize : function () {
      return this._serWithFormat(this, this.frameFormat);
    }
  });
  Type.Prefix = Prefix;

  /**
   * Call message
   */
  var Call = pisces.Class(OutboundMessage, {
    type : 2
    ,
    serialize : function () {
      var frame = new Array();

      frame.push(this.type);
      frame.push(pisces.Protocol.newCallId());
      frame.push(this.procURI);
      for (var i = 0 ; i < this.parameters.length; i++) {
        frame.push(parameters[i]);
      }
      return frame;
    }
  });
  Type.Call = Call;

  /**
   * CallResult message
   */
  var CallResult = pisces.Class(InboundMessage, {
    type : 3,
    frameFormat : [
      'type',
      'callId',
      'result'
    ]
    ,
    deserialize : function (frame) {
      return this._desWithFormat(frame, this.frameFormat);
    }
  });
  Type.CallResult = CallResult;

  var CallError = pisces.Class(InboundMessage, {
    type : 4,
    deserialize : function (frame) {
      var obj = {};
      obj.type = frame[0];
      obj.callId = frame[1];
      obj.errorURI = frame[2];
      obj.errorDesc = frame[3];

      if (frame.length == 5) {
        obj.errorDetails = frame[4];
      }

      return obj;
    } 
  });
  Type.CallError = CallError;

  var Subscribe = pisces.Class(OutboundMessage, {
    type : 5,
    frameFormat : [
    'type',
    'topicURI'
    ]
    ,
    serialize : function () {
      return this._serWithFormat(this, this.frameFormat);
    }
  });
  Type.Subscribe = Subscribe;

  var Unsubscribe = pisces.Class(OutboundMessage, {
    type : 6,
    frameFormat : [
    'type',
    'topicURI'
    ]
    ,
    serialize : function () {
      return this._serWithFormat(this, this.frameFormat);
    }
  });
  Type.Unsbscribe = Unsubscribe;

  var Publish = pisces.Class(OutboundMessage, {
    type : 7,
    serialize : function () {
      var frame = new Array();

      // mandatory parameters
      frame.push(this.type);
      frame.push(this.topicURI);
      frame.push(this.event);

      // optinal parameters
      if (this.excludeMe) {
        frame.push(this.excludeMe);
      }
      else if (this.exclude || this.eligible) {
        frame.push((this.exclude || []));
        frame.push((this.eligible || []));
      }
      return frame;
    }
  });
  Type.Publish = Publish;

  var Event = pisces.Class(OutboundMessage, {
    type : 8,
    frameFormat : [
    'type',
    'topicURI',
    'event'
     ]
    ,
    deserialize : function (frame) {
      return this._desWithFormat(frame, this.frameFormat);
    }
  });
  Type.Event = Event;

  // export as Singleton
  window.pisces.Protocol = Protocol;

}(window);
