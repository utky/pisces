pisces 
=====

WebSocket Application Messaging Protocol Library

About
----

pisces is websocket library based on subprotocol 'WebSocket Appilication Messaging Protocol'.

Getting started
----

T.B.D.

Usage
----

T.B.D.

### Create a socket

  var url = 'ws://host.name/path/to/websocket/wamp.endpoint';
  var p = pisces(url);

  var id = p.id;
  var reuse = pisces(id);

### Wrap WebSocket

  var ws = new WebSocket(url);
  var p = pisces(ws);

### Send a message to procedure

  var params = { first : 1, second : '2nd' };
  p.proc('procname:methodname')
    .handlers()
    .onmessage(function(response) {alert(response)})
    .send(params);

### Publish a message to topic

Models
----

<pre>
Context : per document
+  pisces : per WebSocket
   Session
   |
   +--- Queue (is the name "Queue" correct?)
   |
   +--- Topic
</pre>

### pisces

pisces is the root object that works as a operation facade on one WebSocket Session


Dependencies
----

No dependencies.
