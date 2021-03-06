// Generated by CoffeeScript 1.4.0
(function() {
  var $, CodeMirror, XRegExp, build, buildEvaluator, buildGraphExample, buildGraphExercise, buildShaderExample, buildShaderExercise, buildShaderTemp, exerciseModel, graphModel, ko, makeEqualObservables, makeGraphF, parseUniforms, rafAnimate, shaderModel, showTip, srcTrim, startTime, testEqualGraphs, testEqualPixelArrays, updateUniforms, _,
    __hasProp = {}.hasOwnProperty;

  ko = require("knockout");

  $ = require("jquery");

  _ = require("underscore");

  CodeMirror = require("codemirror");

  require("bindings");

  srcTrim = function(s) {
    var indent, line, lineIndent, lines, _i, _len;
    lines = s.split("\n");
    indent = Infinity;
    for (_i = 0, _len = lines.length; _i < _len; _i++) {
      line = lines[_i];
      lineIndent = line.search(/[^ ]/);
      if (lineIndent !== -1) {
        indent = Math.min(indent, lineIndent);
      }
    }
    if (indent !== Infinity) {
      lines = (function() {
        var _j, _len1, _results;
        _results = [];
        for (_j = 0, _len1 = lines.length; _j < _len1; _j++) {
          line = lines[_j];
          _results.push(line.substr(indent));
        }
        return _results;
      })();
    }
    return lines.join("\n").trim();
  };

  XRegExp = require('xregexp').XRegExp;

  parseUniforms = function(src) {
    var regex, uniforms;
    regex = XRegExp('uniform +(?<type>[^ ]+) +(?<name>[^ ;]+) *;', 'g');
    uniforms = {};
    XRegExp.forEach(src, regex, function(match) {
      return uniforms[match.name] = {
        type: match.type
      };
    });
    return uniforms;
  };

  rafAnimate = function(callback) {
    var animate;
    animate = function() {
      require("raf")(animate);
      return callback();
    };
    return animate();
  };

  makeEqualObservables = function(o1, o2) {
    var value;
    value = void 0;
    ko.computed(function() {
      var newValue;
      newValue = o1();
      if (value !== newValue) {
        value = newValue;
        return o2(value);
      }
    });
    return ko.computed(function() {
      var newValue;
      newValue = o2();
      if (value !== newValue) {
        value = newValue;
        return o1(value);
      }
    });
  };

  showTip = function($el, position, message) {
    var Tip, tip;
    Tip = require("tip");
    tip = new Tip("<div style='width: 270px'>" + message + "</div>");
    tip.suggested = function() {
      return void 0;
    };
    return tip.position(position).show($el[0]);
  };

  startTime = Date.now();

  updateUniforms = function(model) {
    var changed, name, time, uniform, uniforms;
    uniforms = model.uniforms();
    changed = false;
    for (name in uniforms) {
      if (!__hasProp.call(uniforms, name)) continue;
      uniform = uniforms[name];
      if (name === "time" && uniform.type === "float") {
        if (model.playing()) {
          model.time(Date.now() - model.playing());
        }
        time = model.time() / 1000;
        if (uniform.value !== time) {
          uniform.value = model.time() / 1000;
          changed = true;
        }
      } else if (name === "webcam" && uniform.type === "sampler2D") {
        uniform.value = require("webcam")();
        changed = true;
      }
    }
    if (changed) {
      return model.uniforms(uniforms);
    }
  };

  shaderModel = function(src) {
    var model, parsedSrc;
    model = {
      bounds: ko.observable({
        minX: 0,
        minY: 0,
        maxX: 1,
        maxY: 1
      }),
      src: ko.observable(src),
      compiledSrc: ko.observable(src),
      errors: ko.observable([]),
      annotations: ko.observable([]),
      uniforms: ko.observable({}),
      playing: ko.observable(false),
      time: ko.observable(0),
      position: ko.observable([0.3, 0.4])
    };
    rafAnimate(function() {
      return updateUniforms(model);
    });
    model.play = function() {
      return model.playing(Date.now() - model.time());
    };
    model.pause = function() {
      return model.playing(false);
    };
    model.rewind = function() {
      model.time(0);
      if (model.playing()) {
        return model.playing(Date.now() - model.time());
      }
    };
    model.play();
    ko.computed(function() {
      var errors;
      src = model.src();
      errors = require("glsl-error")(src);
      model.errors(errors);
      if (!_.some(errors)) {
        return model.compiledSrc(src);
      }
    });
    ko.computed(function() {
      src = model.compiledSrc();
      return model.uniforms(parseUniforms(src));
    });
    parsedSrc = ko.computed(function() {
      src = model.compiledSrc();
      try {
        return require("parse-glsl").parse(src, "fragment_start");
      } catch (_error) {}
    });
    (ko.computed(function() {
      var annotations, ast, env, name, position, round, uniform, uniforms, x;
      position = model.position();
      if (position) {
        round = function(x) {
          var mult;
          mult = Math.pow(10, 3);
          return Math.round(x * mult) / mult;
        };
        position = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = position.length; _i < _len; _i++) {
            x = position[_i];
            _results.push(round(x));
          }
          return _results;
        })();
        ast = parsedSrc();
        uniforms = model.uniforms();
        env = {
          gl_FragColor: [0, 0, 0, 0],
          position: position
        };
        for (name in uniforms) {
          if (!__hasProp.call(uniforms, name)) continue;
          uniform = uniforms[name];
          env[name] = _.isNumber(uniform.value) ? [uniform.value] : uniform.value;
        }
        try {
          require("interpret")(env, ast);
          annotations = require("interpret").extractStatements(ast);
          return model.annotations(annotations);
        } catch (e) {
          model.annotations([]);
          return console.log(ast);
        }
      }
    })).extend({
      throttle: 1
    });
    return model;
  };

  makeGraphF = function(src) {
    var ast;
    ast = require("parse-glsl").parse(src, "assignment_expression");
    return function(x) {
      require("interpret")({
        x: [x]
      }, ast);
      return ast.evaluated[0];
    };
  };

  graphModel = function(src, $deconstruct) {
    var model;
    model = {
      src: ko.observable(src),
      compiledSrc: ko.observable(src),
      showSrc: ko.observable(src),
      annotations: ko.observable([]),
      errors: ko.observable([]),
      bounds: ko.observable({
        minX: -2,
        minY: -2,
        maxX: 2,
        maxY: 2
      }),
      f: ko.observable(false)
    };
    ko.computed(function() {
      var compiled, f;
      src = model.src();
      compiled = false;
      try {
        f = makeGraphF(src);
        if (_.isNumber(f(0))) {
          compiled = true;
        }
      } catch (_error) {}
      if (compiled) {
        model.compiledSrc(src);
        return model.errors([]);
      } else {
        return model.errors([
          {
            line: 0,
            message: ""
          }
        ]);
      }
    });
    ko.computed(function() {
      return model.showSrc(model.compiledSrc());
    });
    ko.computed(function() {
      src = model.showSrc();
      return model.f(makeGraphF(src));
    });
    if ($deconstruct) {
      ko.computed(function() {
        src = model.compiledSrc();
        return require("deconstruct")({
          div: $deconstruct,
          src: src
        });
      });
      $deconstruct.on("mouseover", ".deconstruct-node", function(e) {
        src = $(this).text();
        return model.showSrc(src);
      });
      $deconstruct.on("mouseout", ".deconstruct-node", function(e) {
        return model.showSrc(model.compiledSrc());
      });
    }
    return model;
  };

  exerciseModel = function(startSrc, solutionSrcs) {
    var model;
    model = {
      workSrcs: [startSrc],
      solutionSrcs: solutionSrcs,
      workSrc: ko.observable(startSrc),
      solutionSrc: ko.observable(solutionSrcs[0]),
      solved: ko.observable(false),
      currentExercise: ko.observable(0),
      numExercises: solutionSrcs.length
    };
    model.onFirst = ko.computed(function() {
      return model.currentExercise() === 0;
    });
    model.onLast = ko.computed(function() {
      return model.currentExercise() === model.numExercises - 1;
    });
    model.previous = function() {
      if (!model.onFirst()) {
        return model.currentExercise(model.currentExercise() - 1);
      }
    };
    model.next = function() {
      if (!model.onLast()) {
        return model.currentExercise(model.currentExercise() + 1);
      }
    };
    ko.computed(function() {
      var currentExercise;
      currentExercise = model.currentExercise();
      model.solutionSrc(model.solutionSrcs[currentExercise]);
      if (model.workSrcs[currentExercise]) {
        return model.workSrc(model.workSrcs[currentExercise]);
      }
    });
    ko.computed(function() {
      var workSrc;
      workSrc = model.workSrc();
      return model.workSrcs[model.currentExercise.peek()] = workSrc;
    });
    return model;
  };

  buildShaderExample = function($replace) {
    var $div, model, src;
    src = srcTrim($replace.text());
    model = shaderModel(src);
    $div = $("<div class=\"book-view-edit\">\n  <div class=\"book-view\" data-bind=\"panAndZoom: {bounds: bounds, position: position}\">\n    <canvas data-bind=\"drawShader: {bounds: bounds, src: compiledSrc, uniforms: uniforms}\"></canvas>\n    <canvas class=\"book-grid\" data-bind=\"drawGrid: {bounds: bounds, color: 'white'}\"></canvas>\n    <!--<div class=\"book-crosshair\" data-bind=\"relPosition: {bounds: bounds, position: position}\"></div>-->\n    <!--<div style=\"position: absolute\">\n      <div data-bind=\"click: play\">Play</div>\n      <div data-bind=\"click: pause\">Pause</div>\n      <div data-bind=\"click: rewind\">Rewind</div>\n    </div>-->\n  </div>\n  <div class=\"book-edit book-editor\" data-bind=\"editorShader: {src: src, multiline: true, errors: errors, annotations: annotations}\"></div>\n</div>");
    $replace.replaceWith($div);
    ko.applyBindings(model, $div[0]);
    return $div;
  };

  buildShaderTemp = function($replace) {
    var $div, model, shown, src;
    src = srcTrim($replace.find(".code").text());
    shown = srcTrim($replace.find(".shown").text());
    model = shaderModel(src);
    model.shown = ko.observable(shown);
    $div = $("<div class=\"book-view-edit\">\n  <div class=\"book-view\" data-bind=\"panAndZoom: {bounds: bounds, position: position}\">\n    <canvas data-bind=\"drawShader: {bounds: bounds, src: compiledSrc, uniforms: uniforms}\"></canvas>\n    <canvas class=\"book-grid\" data-bind=\"drawGrid: {bounds: bounds, color: 'white'}\"></canvas>\n  </div>\n  <div class=\"book-edit book-editor\" data-bind=\"editorShader: {src: shown, multiline: true, errors: errors, annotations: annotations}\"></div>\n</div>");
    $replace.replaceWith($div);
    ko.applyBindings(model, $div[0]);
    return $div;
  };

  testEqualPixelArrays = function(p1, p2) {
    var diff, equivalent, i, len, location, _i;
    len = p1.length;
    equivalent = true;
    for (i = _i = 0; _i < 1000; i = ++_i) {
      location = Math.floor(Math.random() * len);
      diff = Math.abs(p1[location] - p2[location]);
      if (diff > 2) {
        equivalent = false;
      }
    }
    return equivalent;
  };

  buildShaderExercise = function($replace) {
    var $div, checkSolved, model, solutionSrcs, startSrc;
    $div = $("<div>\n  <div class=\"book-view-edit\">\n    <div class=\"book-view\" data-bind=\"panAndZoom: {bounds: work.bounds, position: work.position}\">\n      <canvas class=\"shader-work\" data-bind=\"drawShader: {bounds: work.bounds, src: work.compiledSrc, uniforms: work.uniforms}\"></canvas>\n      <canvas class=\"book-grid\" data-bind=\"drawGrid: {bounds: work.bounds, color: 'white'}\"></canvas>\n    </div>\n    <div class=\"book-edit book-editor\" data-bind=\"editorShader: {src: work.src, multiline: true, errors: work.errors, annotations: work.annotations}\">\n    </div>\n  </div>\n  <div class=\"book-view-edit\">\n    <div class=\"book-view\" data-bind=\"panAndZoom: {bounds: work.bounds, position: work.position}\">\n      <canvas class=\"shader-solution\" data-bind=\"drawShader: {bounds: work.bounds, src: solution.compiledSrc, uniforms: work.uniforms}\"></canvas>\n      <canvas class=\"book-grid\" data-bind=\"drawGrid: {bounds: work.bounds, color: 'white'}\"></canvas>\n    </div>\n    <div class=\"book-edit\" style=\"font-family: helvetica; font-size: 30px;\" data-bind=\"with: exercise\">\n      <div style=\"float: left; margin-top: 2px; font-size: 26px\">\n        <i class=\"icon-arrow-left\"></i>\n      </div>\n      <div style=\"margin-left: 30px;\">\n        <div>\n          Make this\n        </div>\n        <div data-bind=\"style: {visibility: solved() ? 'visible' : 'hidden'}\">\n          <span style=\"color: #090; font-size: 42px\"><i class=\"icon-ok\"></i> <span style=\"font-size: 42px; font-weight: bold\">Solved</span></span>\n        </div>\n        <div>\n          <button style=\"vertical-align: middle\" data-bind=\"disable: onFirst, event: {click: previous}\">&#x2190;</button>\n          <span data-bind=\"text: currentExercise()+1\"></span> of <span data-bind=\"text: numExercises\"></span>\n          <button style=\"vertical-align: middle\" data-bind=\"disable: onLast, event: {click: next}\">&#x2192;</button>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>");
    startSrc = srcTrim($replace.find(".start").text());
    solutionSrcs = $replace.find(".solution").map(function() {
      return srcTrim($(this).text());
    });
    model = {
      exercise: exerciseModel(startSrc, solutionSrcs),
      work: shaderModel(startSrc),
      solution: shaderModel(solutionSrcs[0])
    };
    makeEqualObservables(model.solution.src, model.exercise.solutionSrc);
    makeEqualObservables(model.work.src, model.exercise.workSrc);
    ko.computed(function() {
      model.work.compiledSrc();
      model.solution.compiledSrc();
      return setTimeout(checkSolved, 0);
    });
    checkSolved = function() {
      var solutionPixels, solved, workPixels, _ref, _ref1;
      workPixels = (_ref = $div.find(".shader-work")[0].shader) != null ? _ref.readPixels() : void 0;
      solutionPixels = (_ref1 = $div.find(".shader-solution")[0].shader) != null ? _ref1.readPixels() : void 0;
      if (workPixels && solutionPixels) {
        solved = testEqualPixelArrays(workPixels, solutionPixels);
        return model.exercise.solved(solved);
      }
    };
    $replace.replaceWith($div);
    ko.applyBindings(model, $div[0]);
    return $div;
  };

  buildEvaluator = function($replace) {
    var $div, model, src;
    src = srcTrim($replace.text());
    $div = $("<div class=\"book-text\">\n  <div class=\"book-editor\" data-bind=\"editorShader: {src: src, multiline: false, annotations: annotations, errors: errors}\"></div>\n</div>");
    model = {
      src: ko.observable(src),
      annotations: ko.observable([]),
      errors: ko.observable([])
    };
    ko.computed(function() {
      var ast, result;
      src = model.src();
      try {
        ast = require("parse-glsl").parse(src, "assignment_expression");
        require("interpret")({}, ast);
        result = require("interpret").vecToString(ast.evaluated, 3);
        model.annotations([
          {
            line: 0,
            message: result
          }
        ]);
        return model.errors([]);
      } catch (e) {
        model.annotations([]);
        return model.errors([
          {
            line: 0,
            message: ""
          }
        ]);
      }
    });
    $replace.replaceWith($div);
    ko.applyBindings(model, $div[0]);
    return $div;
  };

  buildGraphExample = function($replace) {
    var $deconstruct, $div, model, src;
    src = srcTrim($replace.text());
    $div = $("<div class=\"split\">\n  <div class=\"left\" data-bind=\"panAndZoom: {bounds: bounds}\">\n    <canvas class=\"book-grid\" data-bind=\"drawGrid: {bounds: bounds, color: 'black'}\"></canvas>\n    <canvas data-bind=\"drawGraph: {bounds: bounds, f: f, color: 'rgba(0, 0, 180, 1.0)'}\"></canvas>\n  </div>\n  <div class=\"right\">\n    <div class=\"book-editor\" data-bind=\"editorShader: {src: src, multiline: false, errors: errors, annotations: annotations}\"></div>\n    <div class=\"deconstruct\"></div>\n  </div>\n</div>");
    $deconstruct = $div.find(".deconstruct");
    model = graphModel(src, $deconstruct);
    $replace.replaceWith($div);
    ko.applyBindings(model, $div[0]);
    return $div;
  };

  testEqualGraphs = function(f1, f2) {
    var diff, equivalent, i, x, _i;
    equivalent = true;
    for (i = _i = 0; _i < 100; i = ++_i) {
      x = Math.random() * 100 - 50;
      diff = Math.abs(f1(x) - f2(x));
      if (diff > .0001) {
        equivalent = false;
      }
    }
    return equivalent;
  };

  buildGraphExercise = function($replace) {
    var $deconstruct, $div, model, solutionSrcs, startSrc;
    $div = $("<div class=\"split\">\n  <div class=\"left\" data-bind=\"panAndZoom: {bounds: work.bounds}\">\n    <canvas class=\"book-grid\" data-bind=\"drawGrid: {bounds: work.bounds, color: 'black'}\"></canvas>\n    <canvas data-bind=\"drawGraph: {bounds: work.bounds, f: work.f, color: 'rgba(0, 0, 180, 1.0)'}\"></canvas>\n    <canvas data-bind=\"drawGraph: {bounds: work.bounds, f: solution.f, color: 'rgba(180, 0, 0, 0.75)'}\"></canvas>\n  </div>\n  <div class=\"right\">\n    <div style=\"min-height: 264px\">\n      <div class=\"book-editor\" data-bind=\"editorShader: {src: work.src, multiline: false, errors: work.errors, annotations: work.annotations}\"></div>\n      <div class=\"deconstruct\"></div>\n    </div>\n    <div style=\"font-family: helvetica; font-size: 30px; margin-bottom: 72px\" data-bind=\"with: exercise\">\n      <div style=\"float: left; margin-top: 2px; font-size: 26px\">\n        <i class=\"icon-arrow-left\"></i>\n      </div>\n      <div style=\"margin-left: 30px;\">\n        <div>\n          Make the <span style='color: rgba(180, 0, 0, 0.75); font-weight: bold'>red</span> graph\n        </div>\n        <div data-bind=\"style: {visibility: solved() ? 'visible' : 'hidden'}\">\n          <span style=\"color: #090; font-size: 42px\"><i class=\"icon-ok\"></i> <span style=\"font-size: 42px; font-weight: bold\">Solved</span></span>\n        </div>\n        <div>\n          <button style=\"vertical-align: middle\" data-bind=\"disable: onFirst, event: {click: previous}\">&#x2190;</button>\n          <span data-bind=\"text: currentExercise()+1\"></span> of <span data-bind=\"text: numExercises\"></span>\n          <button style=\"vertical-align: middle\" data-bind=\"disable: onLast, event: {click: next}\">&#x2192;</button>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>");
    startSrc = srcTrim($replace.find(".start").text());
    solutionSrcs = $replace.find(".solution").map(function() {
      return srcTrim($(this).text());
    });
    $deconstruct = $div.find(".deconstruct");
    model = {
      exercise: exerciseModel(startSrc, solutionSrcs),
      work: graphModel(startSrc, $deconstruct),
      solution: graphModel(solutionSrcs[0])
    };
    makeEqualObservables(model.solution.src, model.exercise.solutionSrc);
    makeEqualObservables(model.work.src, model.exercise.workSrc);
    ko.computed(function() {
      var f, solved;
      model.work.compiledSrc();
      model.solution.f();
      solved = false;
      try {
        f = makeGraphF(model.work.compiledSrc());
        solved = testEqualGraphs(f, model.solution.f());
      } catch (e) {
        solved = false;
      }
      return model.exercise.solved(solved);
    });
    $replace.replaceWith($div);
    ko.applyBindings(model, $div[0]);
    return $div;
  };

  build = function($selection, buildFunction) {
    return $selection.each(function() {
      var $div, $explains, $replace;
      $replace = $(this);
      $explains = $replace.find(".explain");
      $explains.remove();
      $div = buildFunction($replace);
      return $explains.each(function() {
        var $explain, message, position, select;
        $explain = $(this);
        select = $explain.attr("select");
        position = $explain.attr("position");
        message = $explain.html();
        return showTip($div.find(select), position, message);
      });
    });
  };

  (function() {
    build($(".shader-example"), buildShaderExample);
    build($(".shader-exercise"), buildShaderExercise);
    build($(".evaluator"), buildEvaluator);
    build($(".graph-example"), buildGraphExample);
    build($(".graph-exercise"), buildGraphExercise);
    build($(".shader-temp"), buildShaderTemp);
    return $("code").each(function() {
      CodeMirror.runMode($(this).text(), "text/x-glsl", this);
      return $(this).addClass("cm-s-default");
    });
  })();

}).call(this);
