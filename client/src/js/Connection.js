function Connection(url) {
  var _backOff = new ExponentialBackoff(1000, 2, 6000);
  var _ws;

  var _connected = false;
  var _reconnect = true;
  var _callbacks = {};

  var _emit = function(e, evt) {
    if (_callbacks.hasOwnProperty(e)) {
      _callbacks[e].forEach(function(f) {
        f(evt);
      });
    }
  };

  const _onmessage = function(message) {
    try {
      var json = JSON.parse(message.data);
      _emit('message', json);
    } catch (e) {
      _emit('error', {"msg": "cannot parse json response"});
    }
  };
  const _onopen = function() {
    _connected = true;
    _emit('connect');
  };
  const _handleError = function() {
    _connected = false;
    try {
      _ws.close();
    } catch (e) {
    }
    _ws = false;
    _emit('disconnect');
    if (_reconnect) {
      _backOff.acquire(_connect);
    }
  };
  const _connect = function() {
    _ws = new WebSocket(url);
    _ws.onopen = _onopen;
    _ws.onerror = _handleError;
    _ws.onclose = _handleError;
    _ws.onmessage = _onmessage;
  };

  _connect();

  this.sendJson = function(json) {
    if (_connected) {
      _ws.send(JSON.stringify(json));
    }
  };

  this.on = function(e, callback) {
    if (!(e in _callbacks)) {
      _callbacks[e] = [];
    }
    _callbacks[e].push(callback);
  };
}
