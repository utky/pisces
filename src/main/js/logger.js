/**
 * logging interfaces definition
 *
 * Logger class has simple API to output messages on console.
 *
 */
!function (window, undefined) {

  var Level = {
    DEBUG : 'DEBUG'
      ,
    INFO : 'INFO'
      ,
    WARN : 'WARN'
      ,
    ERROR : 'ERROR'
  };

  /* --------------------------------------------------------------------------
   * Logger
   * ----------------------------------------------------------------------- */
  var Logger = function(context) {
    if (!context) {
      context = pisces.ctx;
    }
    this.ctx = context;
  };

  Logger.prototype = {
    // Basic log message format
    // e.g. "2013-10-11 13:10:22.234 [DEBUG]: this message is debug message."
    MESSAGE_HEADER : '{0} [{1}]: {2}'
    ,
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
      
      return tmpl.replace(this.PLACE_HOLDER_REGEXP, replacer);

    }
    ,
    log : function(level, message) {
      // format message body
      var args = pisces.args(arguments)

      var params = (args.length > 2) ? args.slice(2) : [];
      var body = this.format.apply(this, [message].concat(params));
      // format message header
      var now = this.tstamp();
      var tmpl = this.format(this.MESSAGE_HEADER, now, level, body);
      // format and output message body
      console.log(tmpl);
    }
    ,
    debug : function(message) {
      this.log.apply(this, [Level.DEBUG].concat(pisces.args(arguments)));
    }
    ,
    error : function(message) {
      this.log.apply(this, [Level.ERROR].concat(pisces.args(arguments)));
    }

  };

  window.pisces.Logger = Logger;

}(window);
