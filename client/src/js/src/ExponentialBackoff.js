function ExponentialBackoff(initial, multiplier, maximum) {
  var self = this;

  var _delay = initial;

  /** @param f callback to be called when the back-off elapses */
  this.acquire = function(f) {
    setTimeout(function() {
      if (f()) {
        self.reset();
      } else {
        _delay *= multiplier;
        self.acquire(f);
      }
    }, _delay);
  };

  this.reset = function() {

  }
}