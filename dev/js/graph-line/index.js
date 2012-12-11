// Generated by CoffeeScript 1.4.0
(function() {
  var map;

  map = function(x, dMin, dMax, rMin, rMax) {
    var ratio;
    ratio = (x - dMin) / (dMax - dMin);
    return ratio * (rMax - rMin) + rMin;
  };

  module.exports = function(opts) {
    var cMaxX, cMaxY, cMinX, cMinY, canvas, ctx, cx, cy, f, height, i, maxX, maxY, minX, minY, resolution, sizeX, sizeY, width, x, y, _i, _ref, _ref1, _ref2;
    ctx = opts.ctx;
    f = opts.f;
    minX = opts.minX;
    maxX = opts.maxX;
    minY = opts.minY;
    maxY = opts.maxY;
    sizeX = maxX - minX;
    sizeY = maxY - minY;
    canvas = ctx.canvas;
    width = canvas.width;
    height = canvas.height;
    cMinX = 0;
    cMaxX = width;
    cMinY = 0;
    cMaxY = height;
    if (opts.flipX) {
      _ref = [cMaxX, cMinX], cMinX = _ref[0], cMaxX = _ref[1];
    }
    if (opts.flipY) {
      _ref1 = [cMaxY, cMinY], cMinY = _ref1[0], cMaxY = _ref1[1];
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#006";
    ctx.beginPath();
    resolution = 0.25;
    for (i = _i = 0, _ref2 = width / resolution; 0 <= _ref2 ? _i <= _ref2 : _i >= _ref2; i = 0 <= _ref2 ? ++_i : --_i) {
      cx = i * resolution;
      x = map(cx, cMinX, cMaxX, minX, maxX);
      y = f(x);
      cy = map(y, minY, maxY, cMinY, cMaxY);
      ctx.lineTo(cx, cy);
    }
    return ctx.stroke();
  };

}).call(this);
