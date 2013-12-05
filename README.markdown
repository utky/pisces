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

### Create a socket

```
// create new socket by instantiate pisces
var endpoit = 'ws://host.name/path/to/websocket/wamp.endpoint';
var p = pisces({url : endpoit});

// get existing socket
var id = p.id; // pisces has identifier to reuse instance
var reuse = pisces(id);

```

### Wrap WebSocket

```
// explicitly specify websocket
var ws = new WebSocket(url);
var p = pisces({ws : ws});

```
### Configure URL abbreviation

```
/*
 * Specify prefix and URI mapping with object literal
 * name : prefix
 * value : URI
 */
p.prefix({
  'procA' : 'http://host.name/websocket/procA',
  'procB' : 'http://host.name/websocket/procB',
  'topicA' : 'http://host.name/websocket/topicA'
});

```

### Send a message to procedure

```
// get procedure with CURIE name
p.proc('procA:methodname')
  // setup callback on response if necessary
  .onresult(function(data) {alert(data)})
  // execute sending request to the procedure
  .send('firstPram', 'secondParam', { name : 'thirdParam', value : 'thirdValue'});
```

### Publish a message to topic

```
// get topic with CURIE name
p.proc('topicA')
  // setup callback on response if necessary
  .onevent(function(data) {alert(data)})
  // execute sending request to the procedure
  .send('firstPram', 'secondParam', { name : 'thirdParam', value : 'thirdValue'});
```
Model Structure
----

<pre>
Context : per document
  pisces : per Session
    Session : means websocket
      Dispatcher : event listener as `WebSocket.onmessage`
        | memo: dispatcher should create EVENT from message
        Chain : contains user callbacks
    Procedure
    Topic
  Protocol
    Type
      Wel
</pre>

### pisces

pisces is the root object that works as a operation facade on one WebSocket Session


Dependencies
----

No dependencies.
