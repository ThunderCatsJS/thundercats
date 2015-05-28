(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ThunderCats = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":3}],3:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":4}],4:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],5:[function(require,module,exports){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule invariant
 */

'use strict';

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if ("production" !== 'production') {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

},{}],6:[function(require,module,exports){
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

(function() {
  var _global = this;

  // Unique ID creation requires a high quality random # generator.  We feature
  // detect to determine the best RNG source, normalizing to a function that
  // returns 128-bits of randomness, since that's what's usually required
  var _rng;

  // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
  //
  // Moderately fast, high quality
  if (typeof(_global.require) == 'function') {
    try {
      var _rb = _global.require('crypto').randomBytes;
      _rng = _rb && function() {return _rb(16);};
    } catch(e) {}
  }

  if (!_rng && _global.crypto && crypto.getRandomValues) {
    // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
    //
    // Moderately fast, high quality
    var _rnds8 = new Uint8Array(16);
    _rng = function whatwgRNG() {
      crypto.getRandomValues(_rnds8);
      return _rnds8;
    };
  }

  if (!_rng) {
    // Math.random()-based (RNG)
    //
    // If all else fails, use Math.random().  It's fast, but is of unspecified
    // quality.
    var  _rnds = new Array(16);
    _rng = function() {
      for (var i = 0, r; i < 16; i++) {
        if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
        _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
      }

      return _rnds;
    };
  }

  // Buffer class to use
  var BufferClass = typeof(_global.Buffer) == 'function' ? _global.Buffer : Array;

  // Maps for number <-> hex string conversion
  var _byteToHex = [];
  var _hexToByte = {};
  for (var i = 0; i < 256; i++) {
    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
    _hexToByte[_byteToHex[i]] = i;
  }

  // **`parse()` - Parse a UUID into it's component bytes**
  function parse(s, buf, offset) {
    var i = (buf && offset) || 0, ii = 0;

    buf = buf || [];
    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
      if (ii < 16) { // Don't overflow!
        buf[i + ii++] = _hexToByte[oct];
      }
    });

    // Zero out remaining bytes if string was short
    while (ii < 16) {
      buf[i + ii++] = 0;
    }

    return buf;
  }

  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
  function unparse(buf, offset) {
    var i = offset || 0, bth = _byteToHex;
    return  bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]];
  }

  // **`v1()` - Generate time-based UUID**
  //
  // Inspired by https://github.com/LiosK/UUID.js
  // and http://docs.python.org/library/uuid.html

  // random #'s we need to init node and clockseq
  var _seedBytes = _rng();

  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
  var _nodeId = [
    _seedBytes[0] | 0x01,
    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
  ];

  // Per 4.2.2, randomize (14 bit) clockseq
  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

  // Previous uuid creation time
  var _lastMSecs = 0, _lastNSecs = 0;

  // See https://github.com/broofa/node-uuid for API details
  function v1(options, buf, offset) {
    var i = buf && offset || 0;
    var b = buf || [];

    options = options || {};

    var clockseq = options.clockseq != null ? options.clockseq : _clockseq;

    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = options.msecs != null ? options.msecs : new Date().getTime();

    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

    // Time since last uuid creation (in msecs)
    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

    // Per 4.2.1.2, Bump clockseq on clock regression
    if (dt < 0 && options.clockseq == null) {
      clockseq = clockseq + 1 & 0x3fff;
    }

    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
    // time interval
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
      nsecs = 0;
    }

    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
    }

    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;

    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;

    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;

    // `time_mid`
    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;

    // `time_high_and_version`
    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
    b[i++] = tmh >>> 16 & 0xff;

    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = clockseq >>> 8 | 0x80;

    // `clock_seq_low`
    b[i++] = clockseq & 0xff;

    // `node`
    var node = options.node || _nodeId;
    for (var n = 0; n < 6; n++) {
      b[i + n] = node[n];
    }

    return buf ? buf : unparse(b);
  }

  // **`v4()` - Generate random UUID**

  // See https://github.com/broofa/node-uuid for API details
  function v4(options, buf, offset) {
    // Deprecated - 'format' argument, as supported in v1.2
    var i = buf && offset || 0;

    if (typeof(options) == 'string') {
      buf = options == 'binary' ? new BufferClass(16) : null;
      options = null;
    }
    options = options || {};

    var rnds = options.random || (options.rng || _rng)();

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Copy bytes to buffer, if provided
    if (buf) {
      for (var ii = 0; ii < 16; ii++) {
        buf[i + ii] = rnds[ii];
      }
    }

    return buf || unparse(rnds);
  }

  // Export public API
  var uuid = v4;
  uuid.v1 = v1;
  uuid.v4 = v4;
  uuid.parse = parse;
  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;

  if (typeof(module) != 'undefined' && module.exports) {
    // Publish as node.js module
    module.exports = uuid;
  } else  if (typeof define === 'function' && define.amd) {
    // Publish as AMD module
    define(function() {return uuid;});
 

  } else {
    // Publish as global (in browsers)
    var _previousRoot = _global.uuid;

    // **`noConflict()` - (browser only) to reset global 'uuid' var**
    uuid.noConflict = function() {
      _global.uuid = _previousRoot;
      return uuid;
    };

    _global.uuid = uuid;
  }
}).call(this);

},{}],7:[function(require,module,exports){
var keys = require('object-keys');

module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	if (typeof sym === 'string') { return false; }
	obj[sym] = 42;
	for (sym in obj) { return false; }
	if (keys(obj).length !== 0) { return false; }
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function') {
		var names = Object.getOwnPropertyNames(obj);
		if (names.length !== 0) { return false; }
	}

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== 42 || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

},{"object-keys":11}],8:[function(require,module,exports){
'use strict';

// modified from https://github.com/es-shims/es6-shim
var keys = require('object-keys');
var canBeObject = function (obj) {
	return typeof obj !== 'undefined' && obj !== null;
};
var hasSymbols = require('./hasSymbols')();
var defineProperties = require('define-properties');
var propIsEnumerable = Object.prototype.propertyIsEnumerable;
var isEnumerableOn = function (obj) {
	return function isEnumerable(prop) {
		return propIsEnumerable.call(obj, prop);
	};
};

var assignShim = function assign(target, source1) {
	if (!canBeObject(target)) { throw new TypeError('target must be an object'); }
	var objTarget = Object(target);
	var s, source, i, props;
	for (s = 1; s < arguments.length; ++s) {
		source = Object(arguments[s]);
		props = keys(source);
		if (hasSymbols && Object.getOwnPropertySymbols) {
			props.push.apply(props, Object.getOwnPropertySymbols(source).filter(isEnumerableOn(source)));
		}
		for (i = 0; i < props.length; ++i) {
			objTarget[props[i]] = source[props[i]];
		}
	}
	return objTarget;
};

defineProperties(assignShim, {
	shim: function shimObjectAssign() {
		var assignHasPendingExceptions = function () {
			if (!Object.assign || !Object.preventExtensions) {
				return false;
			}
			// Firefox 37 still has "pending exception" logic in its Object.assign implementation,
			// which is 72% slower than our shim, and Firefox 40's native implementation.
			var thrower = Object.preventExtensions({ 1: 2 });
			try {
				Object.assign(thrower, 'xy');
			} catch (e) {
				return thrower[1] === 'y';
			}
		};
		defineProperties(
			Object,
			{ assign: assignShim },
			{ assign: assignHasPendingExceptions }
		);
		return Object.assign || assignShim;
	}
});

module.exports = assignShim;


},{"./hasSymbols":7,"define-properties":9,"object-keys":11}],9:[function(require,module,exports){
'use strict';

var keys = require('object-keys');
var foreach = require('foreach');

var toStr = Object.prototype.toString;

var isFunction = function (fn) {
	return typeof fn === 'function' && toStr.call(fn) === '[object Function]';
};

var arePropertyDescriptorsSupported = function () {
	var obj = {};
	try {
		Object.defineProperty(obj, 'x', { value: obj });
		return obj.x === obj;
	} catch (e) { /* this is IE 8. */
		return false;
	}
};
var supportsDescriptors = Object.defineProperty && arePropertyDescriptorsSupported();

var defineProperty = function (object, name, value, predicate) {
	if (name in object && (!isFunction(predicate) || !predicate())) {
		return;
	}
	if (supportsDescriptors) {
		Object.defineProperty(object, name, {
			configurable: true,
			enumerable: false,
			writable: true,
			value: value
		});
	} else {
		object[name] = value;
	}
};

var defineProperties = function (object, map) {
	var predicates = arguments.length > 2 ? arguments[2] : {};
	foreach(keys(map), function (name) {
		defineProperty(object, name, map[name], predicates[name]);
	});
};

defineProperties.supportsDescriptors = !!supportsDescriptors;

module.exports = defineProperties;

},{"foreach":10,"object-keys":11}],10:[function(require,module,exports){

var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

module.exports = function forEach (obj, fn, ctx) {
    if (toString.call(fn) !== '[object Function]') {
        throw new TypeError('iterator must be a function');
    }
    var l = obj.length;
    if (l === +l) {
        for (var i = 0; i < l; i++) {
            fn.call(ctx, obj[i], i, obj);
        }
    } else {
        for (var k in obj) {
            if (hasOwn.call(obj, k)) {
                fn.call(ctx, obj[k], k, obj);
            }
        }
    }
};


},{}],11:[function(require,module,exports){
'use strict';

// modified from https://github.com/es-shims/es5-shim
var has = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;
var slice = Array.prototype.slice;
var isArgs = require('./isArguments');
var hasDontEnumBug = !({ 'toString': null }).propertyIsEnumerable('toString');
var hasProtoEnumBug = function () {}.propertyIsEnumerable('prototype');
var dontEnums = [
	'toString',
	'toLocaleString',
	'valueOf',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'constructor'
];

var keysShim = function keys(object) {
	var isObject = object !== null && typeof object === 'object';
	var isFunction = toStr.call(object) === '[object Function]';
	var isArguments = isArgs(object);
	var isString = isObject && toStr.call(object) === '[object String]';
	var theKeys = [];

	if (!isObject && !isFunction && !isArguments) {
		throw new TypeError('Object.keys called on a non-object');
	}

	var skipProto = hasProtoEnumBug && isFunction;
	if (isString && object.length > 0 && !has.call(object, 0)) {
		for (var i = 0; i < object.length; ++i) {
			theKeys.push(String(i));
		}
	}

	if (isArguments && object.length > 0) {
		for (var j = 0; j < object.length; ++j) {
			theKeys.push(String(j));
		}
	} else {
		for (var name in object) {
			if (!(skipProto && name === 'prototype') && has.call(object, name)) {
				theKeys.push(String(name));
			}
		}
	}

	if (hasDontEnumBug) {
		var ctor = object.constructor;
		var skipConstructor = ctor && ctor.prototype === object;

		for (var k = 0; k < dontEnums.length; ++k) {
			if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
				theKeys.push(dontEnums[k]);
			}
		}
	}
	return theKeys;
};

keysShim.shim = function shimObjectKeys() {
	if (!Object.keys) {
		Object.keys = keysShim;
	} else {
		var keysWorksWithArguments = (function () {
			// Safari 5.0 bug
			return (Object.keys(arguments) || '').length === 2;
		}(1, 2));
		if (!keysWorksWithArguments) {
			var originalKeys = Object.keys;
			Object.keys = function keys(object) {
				if (isArgs(object)) {
					return originalKeys(slice.call(object));
				} else {
					return originalKeys(object);
				}
			};
		}
	}
	return Object.keys || keysShim;
};

module.exports = keysShim;

},{"./isArguments":12}],12:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]' &&
			value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

},{}],13:[function(require,module,exports){
/**
 * Copyright 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule warning
 */

'use strict';

/**
 * Similar to invariant but only logs a warning if the condition is not met.
 * This can be used to log issues in development environments in critical
 * paths. Removing the logging code for production environments will keep the
 * same logic and follow the same code paths.
 */

var __DEV__ = "production" !== 'production';

var warning = function() {};

if (__DEV__) {
  warning = function(condition, format, args) {
    var len = arguments.length;
    args = new Array(len > 2 ? len - 2 : 0);
    for (var key = 2; key < len; key++) {
      args[key - 2] = arguments[key];
    }
    if (format === undefined) {
      throw new Error(
        '`warning(condition, format, ...args)` requires a warning ' +
        'message argument'
      );
    }

    if (format.length < 10 || (/^[s\W]*$/).test(format)) {
      throw new Error(
        'The warning format should be able to uniquely identify this ' +
        'warning. Please, use a more descriptive format than: ' + format
      );
    }

    if (!condition) {
      var argIndex = 0;
      var message = 'Warning: ' +
        format.replace(/%s/g, function() {
          args[argIndex++];
        });
      if (typeof console !== 'undefined') {
        console.error(message);
      }
      try {
        // --- Welcome to debugging React ---
        // This error was thrown as a convenience so that you can use this stack
        // to find the callsite that caused this warning to fire.
        throw new Error(message);
      } catch(x) {}
    }
  };
}

module.exports = warning;

},{}],14:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getActionNames = getActionNames;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _rx = (typeof window !== "undefined" ? window.Rx : typeof global !== "undefined" ? global.Rx : null);

var _rx2 = _interopRequireDefault(_rx);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _objectAssign = require('object.assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _waitFor = require('./waitFor');

var _waitFor2 = _interopRequireDefault(_waitFor);

var debug = (0, _debug2['default'])('thundercats:actions');

function getActionNames(ctx) {
  return Object.getOwnPropertyNames(ctx.constructor.prototype).filter(function (name) {
    return name !== 'constructor' && name.indexOf('_') === -1 && typeof ctx[name] === 'function';
  });
}

var ActionCreator = {
  create: function create(name, map) {
    var observers = [];
    var actionStart = new _rx2['default'].Subject();

    function action(value) {
      /* istanbul ignore else */
      if (typeof map === 'function') {
        value = map(value);
      }

      actionStart.onNext(value);
      observers.forEach(function (observer) {
        observer.onNext(value);
      });

      return value;
    }

    action.displayName = name;
    action.observers = observers;
    (0, _objectAssign2['default'])(action, _rx2['default'].Observable.prototype, _rx2['default'].Subject.prototype);

    action.hasObservers = function hasObservers() {
      return observers.length > 0 || actionStart.hasObservers();
    };

    action.waitFor = function () {
      var _arguments = arguments;

      return actionStart.flatMap(function (payload) {
        return _waitFor2['default'].apply(undefined, _arguments).map(function () {
          return payload;
        });
      });
    };

    _rx2['default'].Observable.call(action, function (observer) {
      observers.push(observer);
      return new _rx2['default'].Disposable(function () {
        observers.splice(observers.indexOf(observer), 1);
      });
    });

    debug('action %s created', action.displayName);
    return action;
  },

  createManyOn: function createManyOn(ctx, actions) {
    (0, _invariant2['default'])(typeof ctx === 'object', 'thisArg supplied to createActions must be an object but got %s', ctx);

    (0, _invariant2['default'])(Array.isArray(actions), 'createActions requires an array of objects but got %s', actions);

    var actionsBag = actions.reduce(function (ctx, action) {
      (0, _invariant2['default'])(typeof action === 'object', 'createActions requires items in array to be either strings ' + 'or objects but was supplied with %s', action);

      (0, _invariant2['default'])(typeof action.name === 'string', 'createActions requires objects to have a name key, but got %s', action.name);

      /* istanbul ignore else */
      if (action.map) {
        (0, _invariant2['default'])(typeof action.map === 'function', 'createActions requires objects with map field to be a function ' + 'but was given %s', action.map);
      }

      ctx[action.name] = ActionCreator.create(action.name, action.map);
      return ctx;
    }, {});

    return (0, _objectAssign2['default'])(ctx, actionsBag);
  }
};

exports.ActionCreator = ActionCreator;

var Actions = function Actions(actionNames) {
  var _this = this;

  _classCallCheck(this, Actions);

  this.displayName = this.displayName || this.constructor.displayName;
  if (actionNames) {
    (0, _invariant2['default'])(Array.isArray(actionNames) && actionNames.every(function (actionName) {
      return typeof actionName === 'string';
    }), '%s should get an array of strings but got %s', actionNames);
  }
  var actionDefs = getActionNames(this).map(function (name) {
    return { name: name, map: _this[name] };
  });

  if (actionNames) {
    actionDefs = actionDefs.concat(actionNames.map(function (name) {
      return { name: name };
    }));
  }

  (0, _invariant2['default'])(actionDefs.length, 'Actions Class %s instantiated without any actions defined!', this.displayName);

  ActionCreator.createManyOn(this, actionDefs);
};

exports['default'] = Actions;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./waitFor":22,"debug":2,"invariant":5,"object.assign":8}],15:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _rx = (typeof window !== "undefined" ? window.Rx : typeof global !== "undefined" ? global.Rx : null);

var _rx2 = _interopRequireDefault(_rx);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _Store = require('./Store');

var _Store2 = _interopRequireDefault(_Store);

var _Actions = require('./Actions');

var _Actions2 = _interopRequireDefault(_Actions);

var _Translate = require('./Translate');

var _Translate2 = _interopRequireDefault(_Translate);

var _Render = require('./Render');

var _Render2 = _interopRequireDefault(_Render);

var debug = (0, _debug2['default'])('thundercats:cat');

var Register = {
  store: function store(stores, Store, args) {
    var name = Store.displayName;
    if (stores.has(name.toLowerCase())) {
      return (0, _warning2['default'])(false, 'Attempted to add a Store class, %s, that already exists in the Cat', name);
    }
    var store = new (Function.prototype.bind.apply(Store, args))();
    debug('registering store %s', name);
    stores.set(name.toLowerCase(), store);
    return store;
  },

  actions: function actions(actionsMap, Actions, args) {
    var name = Actions.displayName;
    if (actionsMap.has(name.toLowerCase())) {
      return (0, _warning2['default'])(false, 'Attempted to add an Actions class, %s, that already exists in the Cat', name);
    }
    var _actions = new (Function.prototype.bind.apply(Actions, args))();
    debug('registering actions %s', name);
    actionsMap.set(name.toLowerCase(), _actions);
    return _actions;
  }
};

exports.Register = Register;

var Cat = (function () {
  function Cat() {
    _classCallCheck(this, Cat);

    this.stores = new Map();
    this.actions = new Map();
  }

  _createClass(Cat, [{
    key: 'register',
    value: function register(StoreOrActions) {
      (0, _invariant2['default'])(_Store2['default'].isPrototypeOf(StoreOrActions) || _Actions2['default'].isPrototypeOf(StoreOrActions), 'Attempted to add a class that is not a ThunderCats Store or Action');

      var name = StoreOrActions.displayName;

      (0, _invariant2['default'])(typeof name === 'string', 'Attempted to add a Store/Actions that does not have a displayName');

      var isStore = _Store2['default'].isPrototypeOf(StoreOrActions);
      var args = [].slice.call(arguments);

      return isStore ? Register.store(this.stores, StoreOrActions, args) : Register.actions(this.actions, StoreOrActions, args);
    }
  }, {
    key: 'getStore',
    value: function getStore(store) {
      return this.stores.get(('' + store).toLowerCase());
    }
  }, {
    key: 'getActions',
    value: function getActions(action) {
      return this.actions.get(('' + action).toLowerCase());
    }
  }, {
    key: 'dehydrate',
    value: function dehydrate() {
      return _Translate2['default'].dehydrate(_rx2['default'].Observable.from(this.stores.values()));
    }
  }, {
    key: 'hydrate',
    value: function hydrate(catState) {
      return _Translate2['default'].hydrate(_rx2['default'].Observable.from(this.stores.values()), _rx2['default'].Observable.just(catState));
    }
  }, {
    key: 'serialize',
    value: function serialize() {
      return _Translate2['default'].serialize(_rx2['default'].Observable.from(this.stores.values()));
    }
  }, {
    key: 'deserialize',
    value: function deserialize(stringyCatState) {
      return _Translate2['default'].deserialize(_rx2['default'].Observable.from(this.stores.values()), _rx2['default'].Observable.just(stringyCatState));
    }
  }, {
    key: 'render',
    value: function render(Component, DOMContainer) {
      return _Render2['default'].render(this, Component, DOMContainer);
    }
  }, {
    key: 'renderToString',
    value: function renderToString(Component) {
      return _Render2['default'].renderToString(this, Component);
    }
  }]);

  return Cat;
})();

exports['default'] = Cat;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Actions":14,"./Render":17,"./Store":18,"./Translate":19,"debug":2,"invariant":5,"warning":13}],16:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _react = (typeof window !== "undefined" ? window.React : typeof global !== "undefined" ? global.React : null);

var _react2 = _interopRequireDefault(_react);

var _reactLibCloneWithProps = require('react/lib/cloneWithProps');

var _reactLibCloneWithProps2 = _interopRequireDefault(_reactLibCloneWithProps);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var ContextWrapper = (function (_React$Component) {
  function ContextWrapper(props) {
    _classCallCheck(this, ContextWrapper);

    _get(Object.getPrototypeOf(ContextWrapper.prototype), 'constructor', this).call(this, props);
  }

  _inherits(ContextWrapper, _React$Component);

  _createClass(ContextWrapper, [{
    key: 'getChildContext',
    value: function getChildContext() {
      return {
        cat: this.props.cat
      };
    }
  }, {
    key: 'render',
    value: function render() {
      return (0, _reactLibCloneWithProps2['default'])(this.props.children);
    }
  }], [{
    key: 'displayName',
    value: 'ThunderCatsContextWrapper',
    enumerable: true
  }, {
    key: 'propTypes',
    value: {
      cat: _react2['default'].PropTypes.object.isRequired,
      children: _react2['default'].PropTypes.element.isRequired
    },
    enumerable: true
  }, {
    key: 'childContextTypes',
    value: {
      cat: _react2['default'].PropTypes.object.isRequired
    },
    enumerable: true
  }, {
    key: 'wrap',

    // wrap a component in this context wrapper
    value: function wrap(element, cat) {
      (0, _invariant2['default'])(_react2['default'].isValidElement(element), 'ContextWrapper wrap expects a valid React element');

      (0, _invariant2['default'])(typeof cat === 'object', 'ContextWrapper expects an instance of Cat');

      return _react2['default'].createElement(ContextWrapper, { cat: cat }, element);
    }
  }]);

  return ContextWrapper;
})(_react2['default'].Component);

exports['default'] = ContextWrapper;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"invariant":5,"react/lib/cloneWithProps":1}],17:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.fetch = fetch;
exports.RenderToObs = RenderToObs;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _rx = (typeof window !== "undefined" ? window.Rx : typeof global !== "undefined" ? global.Rx : null);

var _rx2 = _interopRequireDefault(_rx);

var _react = (typeof window !== "undefined" ? window.React : typeof global !== "undefined" ? global.React : null);

var _react2 = _interopRequireDefault(_react);

var _objectAssign = require('object.assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _ContextWrapper = require('./ContextWrapper');

var _ContextWrapper2 = _interopRequireDefault(_ContextWrapper);

var _waitFor = require('./waitFor');

var _waitFor2 = _interopRequireDefault(_waitFor);

var debug = (0, _debug2['default'])('thundercats:render');

function fetch(fetchMap, stores) {
  if (!fetchMap || fetchMap.size === 0) {
    debug('cat found empty fetch map');
    return _rx2['default'].Observable['return']({
      data: {},
      fetchMap: fetchMap
    });
  }

  var fetchCtx = _rx2['default'].Observable.from(fetchMap.values()).shareReplay();

  var waitForStores = fetchCtx.pluck('store').toArray().tap(function (arrayOfStores) {
    return debug('waiting for %s stores', arrayOfStores.length);
  }).flatMap(function (arrayOfStores) {
    return _waitFor2['default'].apply(undefined, _toConsumableArray(arrayOfStores)).firstOrDefault();
  });

  var storeNames = fetchCtx.pluck('store').pluck('displayName').toArray();

  var fetchObs = fetchCtx.map(function (_ref2) {
    var action = _ref2.action;
    var payload = _ref2.payload;
    return { action: action, payload: payload };
  }).tapOnNext(function () {
    return debug('init individual fetchers');
  }).tapOnNext(function (_ref3) {
    var action = _ref3.action;
    var payload = _ref3.payload;

    action(payload);
  }).tapOnCompleted(function () {
    return debug('fetchers activated');
  }).toArray();

  return _rx2['default'].Observable.combineLatest(waitForStores, fetchObs.delaySubscription(50), function (data) {
    return data;
  }).flatMap(function (data) {
    return _rx2['default'].Observable.from(data);
  }).zip(storeNames, function (data, name) {
    return _defineProperty({}, name, data);
  }).reduce(function (accu, item) {
    return (0, _objectAssign2['default'])({}, accu, item);
  }, {}).map(function (data) {
    return { data: data, fetchMap: fetchMap };
  });
}

function RenderToObs(Comp, DOMContainer) {
  return new _rx2['default'].AnonymousObservable(function (observer) {
    var instance = null;
    instance = _react2['default'].render(Comp, DOMContainer, function (err) {
      /* istanbul ignore else */
      if (err) {
        return observer.onError(err);
      }
      /* istanbul ignore else */
      if (instance) {
        observer.onNext(instance);
      }
    });
    observer.onNext(instance);
  });
}

exports['default'] = {
  render: function render(cat, Component, DOMContainer) {
    return _rx2['default'].Observable.just(Component).map(function (Comp) {
      return _ContextWrapper2['default'].wrap(Comp, cat);
    }).flatMap(function (Burrito) {
      return RenderToObs(Burrito, DOMContainer);
    }, function (Burrito, inst) {
      return inst;
    });
  },

  renderToString: function renderToString(cat, Component) {
    var stores = cat.stores;

    var fetchMap = new Map();
    cat.fetchMap = fetchMap;
    return _rx2['default'].Observable.just(Component).map(function (Comp) {
      return _ContextWrapper2['default'].wrap(Comp, cat);
    }).doOnNext(function (Burrito) {
      debug('initiation fetcher registration');
      _react2['default'].renderToStaticMarkup(Burrito);
      debug('fetcher registration complete');
    }).flatMap(function () {
      return fetch(fetchMap, stores);
    }, function (Burrito, _ref4) {
      var data = _ref4.data;
      var fetchMap = _ref4.fetchMap;

      return {
        Burrito: Burrito,
        data: data,
        fetchMap: fetchMap
      };
    }).map(function (_ref5) {
      var Burrito = _ref5.Burrito;
      var data = _ref5.data;
      var fetchMap = _ref5.fetchMap;

      var markup = _react2['default'].renderToString(Burrito);
      return {
        markup: markup,
        data: data,
        fetchMap: fetchMap
      };
    }).firstOrDefault().tapOnNext(function () {
      return cat.fetchMap = null;
    });
  }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./ContextWrapper":16,"./waitFor":22,"debug":2,"object.assign":8}],18:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

exports.applyOperation = applyOperation;
exports.notifyObservers = notifyObservers;
exports.dispose = dispose;
exports.checkId = checkId;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _rx = (typeof window !== "undefined" ? window.Rx : typeof global !== "undefined" ? global.Rx : null);

var _rx2 = _interopRequireDefault(_rx);

var _nodeUuid = require('node-uuid');

var _nodeUuid2 = _interopRequireDefault(_nodeUuid);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _objectAssign = require('object.assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _Actions = require('./Actions');

var _Actions2 = _interopRequireDefault(_Actions);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var areObservable = _utils2['default'].areObservable;
var createObjectValidator = _utils2['default'].createObjectValidator;
var isObservable = _utils2['default'].isObservable;
var isPromise = _utils2['default'].isPromise;

var debug = (0, _debug2['default'])('thundercats:store');
var __DEV__ = "production" !== 'production';

function validateObservable(observable) {
  /* istanbul ignore else */
  if (__DEV__) {
    (0, _invariant2['default'])(isObservable(observable), 'register should get observables but was given %s', observable);
  }
  return observable;
}

function addOperation(observable, validateItem, map) {
  return validateObservable(observable).tap(validateItem).map(map);
}

var Register = {
  observable: function observable(obs, actionsArr, storeName) {
    actionsArr = actionsArr.slice();
    (0, _invariant2['default'])(isObservable(obs), '%s should register observables but was given %s', storeName, obs);

    debug('%s registering action', storeName);

    actionsArr.push(obs);
    return actionsArr;
  },

  actions: function actions(actionsInst, actionsArr, storeName) {
    var actionNames = (0, _Actions.getActionNames)(actionsInst);

    debug('%s register actions class %s', storeName, actionsInst.displayName);

    return actionNames.reduce(function (actionsArr, name) {
      return Register.observable(actionsInst[name], actionsArr, storeName);
    }, actionsArr);
  }
};

exports.Register = Register;
var Optimism = {
  confirm: function confirm(uid, history) {
    checkId(uid, history);
    history.get(uid).confirmed = true;
    history.forEach(function (operation, uid) {
      /* istanbul ignore else */
      if (operation.confirmed) {
        history['delete'](uid);
      }
    });
    return history;
  },
  revert: function revert(uid, history) {
    checkId(uid, history);
    // initial value
    var value = history.get(uid).oldValue;
    var found = false;
    history.forEach(function (descriptor, _uid) {
      if (uid === _uid) {
        found = true;
        return;
      }
      if (!found) {
        return;
      }
      descriptor.oldValue = value;
      value = applyOperation(value, descriptor.operation);
    });

    history['delete'](uid);
    return {
      history: history,
      value: value
    };
  }
};

exports.Optimism = Optimism;

function applyOperation(oldValue, operation) {
  var replace = operation.replace;
  var transform = operation.transform;
  var set = operation.set;

  if (replace) {
    return replace;
  } else if (transform) {
    return transform(oldValue);
  } else if (set) {
    return (0, _objectAssign2['default'])({}, oldValue, set);
  } else {
    return oldValue;
  }
}

function notifyObservers(value, observers) {
  debug('starting notify cycle');
  observers.forEach(function (observer, uid) {
    debug('notifying %s', uid);
    observer.onNext(value);
  });
}

function dispose(subscription, history) {
  if (subscription) {
    subscription.dispose();
  }
  return new Map();
}

function checkId(id, history) {
  (0, _invariant2['default'])(history.has(id), 'an unknown operation id was used that is not within its history.' + 'it may have been called outside of context');
}

var Store = (function (_Rx$Observable) {
  function Store() {
    _classCallCheck(this, Store);

    _get(Object.getPrototypeOf(Store.prototype), 'constructor', this).call(this, Store.prototype._subscribe);

    this.value = {};
    this._operationsSubscription = null;
    this.actions = [];
    this.observers = new Map();
    this.history = new Map();
    this.displayName = this.constructor.displayName || 'BaseStore';
  }

  _inherits(Store, _Rx$Observable);

  _createClass(Store, [{
    key: 'register',
    value: function register(observableOrActionsInstance) {
      if (observableOrActionsInstance instanceof _Actions2['default']) {
        this.actions = Register.actions(observableOrActionsInstance, this.actions, this.displayName);
        return this.actions;
      }
      this.actions = Register.observable(observableOrActionsInstance, this.actions, this.displayName);
      return this.actions;
    }
  }, {
    key: 'hasObservers',
    value: function hasObservers() {
      return !!this.observers.size;
    }
  }, {
    key: '_init',
    value: function _init() {
      debug('initiating %s', this.displayName);
      this.history = dispose(this._operationsSubscription, this.history);

      (0, _invariant2['default'])(this.actions.length, '%s must have at least one action to listen to but has %s', this.displayName, this.actions.length);

      var operations = [];
      this.actions.forEach(function (observable) {
        operations.push(observable);
      });

      (0, _invariant2['default'])(areObservable(operations), '"%s" actions should be an array of observables', this.displayName);

      this._operationsSubscription = _rx2['default'].Observable.merge(operations).filter(function (operation) {
        return typeof operation.replace === 'object' ? !!operation.replace : true;
      }).filter(function (operation) {
        return typeof operation.set === 'object' ? !!operation.set : true;
      }).doOnNext(function (operation) {
        (0, _invariant2['default'])(typeof operation === 'object', 'invalid operation, operations should be an object, given : %s', operation);

        (0, _invariant2['default'])(typeof operation.replace === 'object' || typeof operation.transform === 'function' || typeof operation.set === 'object', 'invalid operation, ' + 'operations should have a replace(an object), ' + 'transform(a function), or set(an object) property but got %s', Object.keys(operation));

        if ('optimistic' in operation) {
          (0, _invariant2['default'])(isPromise(operation.optimistic) || isObservable(operation.optimistic), 'invalid operation, optimistic should be a promise or observable,' + 'given : %s', operation.optimistic);
        }
      }).subscribe(this._opsOnNext.bind(this), this.opsOnError.bind(this), this.opsOnCompleted.bind(this));
    }
  }, {
    key: '_opsOnNext',
    value: function _opsOnNext(operation) {
      var _this = this;

      var ops = (0, _objectAssign2['default'])({}, operation);

      debug('on next called');
      var oldValue = this.value;
      this.value = applyOperation(this.value, ops);
      notifyObservers(this.value, this.observers);

      var uid = _nodeUuid2['default'].v1();

      this.history.set(uid, {
        operation: ops,
        oldValue: oldValue
      });

      if ('optimistic' in ops) {
        var optimisticObs = isPromise(ops.optimistic) ? _rx2['default'].Observable.fromPromise(ops.optimistic) : ops.optimistic;

        optimisticObs.firstOrDefault().subscribe(function () {}, function (err) {
          debug('optimistic error. reverting changes', err);

          var _Optimism$revert = Optimism.revert(uid, _this.history);

          var value = _Optimism$revert.value;
          var history = _Optimism$revert.history;

          _this.history = history;
          _this.value = value;
          notifyObservers(value, _this.observers);
        }, function () {
          return _this.history = Optimism.confirm(uid, _this.history);
        });
      } else {
        Optimism.confirm(uid, this.history);
      }
    }
  }, {
    key: 'opsOnError',
    value: function opsOnError(err) {
      throw new Error('An error has occurred in the operations observer: ' + err);
    }
  }, {
    key: 'opsOnCompleted',
    value: function opsOnCompleted() {
      console.warn('operations observable has terminated without error');
    }
  }, {
    key: '_subscribe',
    value: function _subscribe(observer) {
      var _this2 = this;

      var uid = _nodeUuid2['default'].v1();

      /* istanbul ignore else */
      if (!this.hasObservers()) {
        this._init();
      }

      debug('adding observer %s', uid);
      this.observers.set(uid, observer);

      observer.onNext(this.value);

      return _rx2['default'].Disposable.create(function () {
        debug('Disposing obserable %s', uid);
        _this2.observers['delete'](uid);
        /* istanbul ignore else */
        if (!_this2.hasObservers()) {
          debug('All observers disposed, disposing operations observer');
          _this2.history = dispose(_this2._operationsSubscription, _this2.history);
        }
      });
    }
  }, {
    key: 'serialize',
    value: function serialize() {
      return this.value ? JSON.stringify(this.value) : '';
    }
  }, {
    key: 'deserialize',
    value: function deserialize(stringyData) {
      var data = JSON.parse(stringyData);
      (0, _invariant2['default'])(data && typeof data === 'object', '%s deserialize must return an object but got: %s', this.displayName, data);
      this.value = data;
      return this.value;
    }
  }], [{
    key: 'createRegistrar',
    value: function createRegistrar(store) {
      function register(observable) {
        store.actions = Register.observable(observable, store.actions, store.displayName);
        return store.actions;
      }
      return register;
    }
  }, {
    key: 'fromMany',
    value: function fromMany() {
      return _rx2['default'].Observable.from(arguments).tap(validateObservable).toArray().flatMap(function (observables) {
        return _rx2['default'].Observable.merge(observables);
      });
    }
  }, {
    key: 'replacer',
    value: function replacer(observable) {
      return addOperation(observable, createObjectValidator('setter should receive objects but was given %s'), function (replace) {
        return { replace: replace };
      });
    }
  }, {
    key: 'setter',
    value: function setter(observable) {
      return addOperation(observable, createObjectValidator('setter should receive objects but was given %s'), function (set) {
        return { set: set };
      });
    }
  }, {
    key: 'transformer',
    value: function transformer(observable) {
      return addOperation(observable, function (fun) {
        /* istanbul ignore else */
        if (__DEV__) {
          (0, _invariant2['default'])(typeof fun === 'function', 'transform should receive functions but was given %s', fun);
        }
      }, function (transform) {
        return { transform: transform };
      });
    }
  }]);

  return Store;
})(_rx2['default'].Observable);

exports['default'] = Store;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Actions":14,"./utils":21,"debug":2,"invariant":5,"node-uuid":6,"object.assign":8}],19:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); }

var _rx = (typeof window !== "undefined" ? window.Rx : typeof global !== "undefined" ? global.Rx : null);

var _rx2 = _interopRequireDefault(_rx);

var _objectAssign = require('object.assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _utils = require('./utils');

var debug = (0, _debug2['default'])('thundercats:translate');

exports['default'] = {
  dehydrate: function dehydrate(storesObservable) {
    return storesObservable.filter(function (store) {
      return !!store.displayName;
    }).filter(function (store) {
      return !!store.value;
    }).map(function (store) {
      return _defineProperty({}, store.displayName, store.value);
    }).reduce(function (allDats, storeDats) {
      return (0, _objectAssign2['default'])(allDats, storeDats);
    }, {}).map(function (allDats) {
      return allDats;
    }).tapOnError(function (err) {
      debug('an error occurred while dehydrating stores', err);
    });
  },

  hydrate: function hydrate(storesObservable, catStateObservable) {
    return _rx2['default'].Observable.combineLatest([storesObservable, catStateObservable.tap((0, _utils.createObjectValidator)('hydrate should get objects but got %s'))], function (store, stateMap) {
      return {
        store: store,
        data: stateMap[store.displayName]
      };
    }).tapOnNext(function (_ref2) {
      var store = _ref2.store;
      var data = _ref2.data;

      if (typeof data === 'object') {
        return;
      }
      debug('hydrate for %s state was not an object but %s', store.displayName, data);
    }).map(function (_ref3) {
      var store = _ref3.store;
      var data = _ref3.data;
      return store.value = data;
    }).lastOrDefault().map(function () {
      return true;
    })['do'](null, function (err) {
      return debug('deserialize encountered a err', err);
    }, function () {
      return debug('deserialize completed');
    });
  },

  deserialize: function deserialize(storesObservable, stringyCatStateObservable) {
    var catStateObservable = stringyCatStateObservable.tap(function (stringyCatState) {
      (0, _invariant2['default'])(typeof stringyCatState === 'string', 'deserialize expects a string but got %s', stringyCatState);
    }).map(function (stringyCatState) {
      return JSON.parse(stringyCatState);
    }).tap(function (catState) {
      (0, _invariant2['default'])(typeof catState === 'object', 'parsed value of deserialize argument should be an object or ' + 'null but got %s', catState);
    });

    return this.hydrate(storesObservable, catStateObservable);
  },

  serialize: function serialize(storesObservable) {
    return this.dehydrate(storesObservable).map(function (allDats) {
      return JSON.stringify(allDats);
    }).map(function (allDats) {
      return typeof allDats === 'string' ? allDats : '{}';
    }).tapOnError(function (err) {
      debug('an error occurred while stringifing stores', err);
    });
  }
};
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./utils":21,"debug":2,"invariant":5,"object.assign":8}],20:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

exports['default'] = createContainer;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _rx = (typeof window !== "undefined" ? window.Rx : typeof global !== "undefined" ? global.Rx : null);

var _rx2 = _interopRequireDefault(_rx);

var _react = (typeof window !== "undefined" ? window.React : typeof global !== "undefined" ? global.React : null);

var _react2 = _interopRequireDefault(_react);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _objectAssign = require('object.assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _utils = require('./utils');

var __DEV__ = "production" !== 'production';
var debug = (0, _debug2['default'])('thundercats:container');

function getChildContext(childContextTypes, currentContext) {

  var compContext = (0, _objectAssign2['default'])({}, currentContext);
  // istanbul ignore else
  if (!childContextTypes || !childContextTypes.cat) {
    delete compContext.cat;
  }
  return compContext;
}

function storeOnError(err) {
  throw new Error('ThunderCats Store encountered an error: ' + err);
}

function storeOnCompleted() {
  console.warn('Store has shutdown without error');
}

function verifyStore(displayName, storeName, store) {
  /* istanbul ignore else */
  if (__DEV__) {
    (0, _invariant2['default'])((0, _utils.isObservable)(store) && typeof store.value === 'object', '%s should get at a store with a value but got %s for %s ' + 'with value %s', displayName, store, storeName, store && store.value);
  }
}

function createContainer(options, Component) {
  /* istanbul ignore else */
  if (__DEV__) {
    (0, _invariant2['default'])(typeof options === 'object', 'createContainer should get an options object but got %s', options);
  }

  /* istanbul ignore else */
  if (!Component) {
    return createContainer.bind(null, options);
  }

  /* istanbul ignore else */
  if (__DEV__) {
    (0, _invariant2['default'])(Component.prototype && Component.prototype.render && Component.prototype.setState, 'createContainer should get a React Component but got %s', (0, _utils.getName)(Component) + 'Container');
  }

  return (function (_React$Component) {
    var _class = function (props, context) {
      var _this = this;

      _classCallCheck(this, _class);

      _get(Object.getPrototypeOf(_class.prototype), 'constructor', this).call(this, props, context);

      /* istanbul ignore else */
      if (__DEV__) {
        (0, _invariant2['default'])(typeof context.cat === 'object', '%s should find an instance of the Cat in the context but got %s', (0, _utils.getName)(this), context.cat);
      }

      var cat = context.cat;
      var val = {};

      // set up observable state. This can be a single store or a combination of
      // multiple stores
      if (options.store) {
        this.observableState = cat.getStore(options.store);
        verifyStore((0, _utils.getName)(this), options.store, this.observableState);

        if (typeof options.map === 'function') {
          val = options.map(this.observableState.value);
          this.observableState = this.observableState.map(options.map);
        } else {
          val = this.observableState.value;
        }
      } else if (options.stores) {
        var _Rx$Observable;

        (function () {
          var storeNames = [].slice.call(options.stores);
          var combineLatest = options.combineLatest;

          /* istanbul ignore else */
          if (__DEV__) {
            (0, _invariant2['default'])(typeof combineLatest === 'function', '%s should get a function for options.combineLatest with ' + ' options.stores but got %s', (0, _utils.getName)(_this), combineLatest);
          }

          var stores = [];
          var values = [];
          storeNames.forEach(function (storeName) {
            var store = cat.getStore(storeName);
            verifyStore((0, _utils.getName)(_this), storeName, store);
            stores.push(store);
            values.push(store.value);
          });

          var args = stores.slice(0);
          args.push(combineLatest);
          _this.observableState = (_Rx$Observable = _rx2['default'].Observable).combineLatest.apply(_Rx$Observable, _toConsumableArray(args));

          val = combineLatest.apply(undefined, values);
        })();
      }

      /* istanbul ignore else */
      if (__DEV__ && (options.store || options.stores)) {
        (0, _invariant2['default'])((0, _utils.isObservable)(this.observableState), '%s should get at a store but found none for %s', (0, _utils.getName)(this), options.store || options.stores);
      }

      this.state = (0, _objectAssign2['default'])({}, val);

      // set up actions on state. These will be passed down as props to child
      if (options.actions) {
        var actionsClassNames = Array.isArray(options.actions) ? options.actions : [options.actions];

        actionsClassNames.forEach(function (name) {
          _this.state[name] = cat.getActions(name);
        });
      }
    };

    _inherits(_class, _React$Component);

    _createClass(_class, [{
      key: 'componentWillMount',
      value: function componentWillMount() {
        var cat = this.context.cat;

        if (options.fetchAction) {
          /* istanbul ignore else */
          if (__DEV__) {
            (0, _invariant2['default'])(options.fetchAction.split('.').length === 2, '%s fetch action should be in the form of ' + '`actionsClass.actionMethod` but was given %s', (0, _utils.getName)(this), options.fetchAction);

            (0, _invariant2['default'])(typeof options.store === 'string' || typeof options.fetchWaitFor === 'string', '%s requires a store to wait for after fetch but was given %s', (0, _utils.getName)(this), options.store || options.fetchWaitFor);

            (0, _invariant2['default'])(typeof options.getPayload === 'function', '%s should get a function for options.getPayload but was given %s', (0, _utils.getName)(this), options.getPayload);
          }

          var fetchActionsName = options.fetchAction.split('.')[0];
          var fetchMethodName = options.fetchAction.split('.')[1];
          var fetchActionsInst = cat.getActions(fetchActionsName);
          var fetchStore = cat.getStore(options.store || options.fetchWaitFor);

          /* istanbul ignore else */
          if (__DEV__) {
            (0, _invariant2['default'])(fetchActionsInst && fetchActionsInst[fetchMethodName], '%s expected to find actions class for %s, but found %s', (0, _utils.getName)(this), options.fetchAction, fetchActionsInst);

            (0, _invariant2['default'])((0, _utils.isObservable)(fetchStore), '%s should get an observable but got %s for %s', (0, _utils.getName)(this), fetchStore, options.fetchWaitFor);
          }

          debug('cat returned %s for %s for %s', fetchActionsInst.displayName, fetchActionsName, (0, _utils.getName)(this));

          var action = fetchActionsInst[fetchMethodName];

          if (cat.fetchMap) {
            debug('%s getPayload in componentWillMount', (0, _utils.getName)(this));
            var payload = options.getPayload(this.props, getChildContext(Component.contextTypes, this.context));

            cat.fetchMap.set(options.fetchAction, {
              name: options.fetchAction,
              payload: payload,
              store: fetchStore,
              action: action
            });
          } else {
            options.action = action;
          }
        }
      }
    }, {
      key: 'componentDidMount',
      value: function componentDidMount() {
        /* istanbul ignore else */
        if (this.observableState) {
          // Now that the component has mounted, we will use a long lived
          // subscription
          this.stateSubscription = this.observableState.subscribe(this.storeOnNext.bind(this), options.storeOnError || storeOnError, options.onCompleted || storeOnCompleted);
        }
        /* istanbul ignore else */
        if (options.action && options.getPayload) {
          debug('%s fetching on componentDidMount', (0, _utils.getName)(this));
          options.action(options.getPayload(this.props, getChildContext(Component.contextTypes, this.context)));
        }
      }
    }, {
      key: 'componentWillReceiveProps',
      value: function componentWillReceiveProps(nextProps, nextContext) {
        /* istanbul ignore else */
        if (options.action && options.shouldContainerFetch && options.shouldContainerFetch(this.props, nextProps, this.context, nextContext)) {
          debug('%s fetching on componentWillReceiveProps', (0, _utils.getName)(this));
          options.action(options.getPayload(nextProps, getChildContext(Component.contextTypes, nextContext)));
        }
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        /* istanbul ignore else */
        if (this.stateSubscription) {
          debug('%s disposing store subscription', (0, _utils.getName)(this));
          this.stateSubscription.dispose();
          this.stateSubscription = null;
        }
      }
    }, {
      key: 'storeOnNext',
      value: function storeOnNext(val) {
        debug('%s value updating', (0, _utils.getName)(this), val);
        this.setState(val);
      }
    }, {
      key: 'render',
      value: function render() {
        return _react2['default'].createElement(Component, (0, _objectAssign2['default'])({}, this.state, this.props));
      }
    }], [{
      key: 'contextTypes',
      value: (0, _objectAssign2['default'])({}, Component.contextTypes || {}, { cat: _react.PropTypes.object.isRequired }),
      enumerable: true
    }, {
      key: 'displayName',
      value: Component.displayName + 'Container',
      enumerable: true
    }, {
      key: 'propTypes',
      value: Component.propTypes || {},
      enumerable: true
    }]);

    return _class;
  })(_react2['default'].Component);
}

module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./utils":21,"debug":2,"invariant":5,"object.assign":8}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

exports['default'] = {
  areObservable: areObservable,
  createObjectValidator: createObjectValidator,
  getName: getName,
  isObservable: isObservable,
  isPromise: isPromise
};

var __DEV__ = "production" !== 'production';

function areObservable(observables) {
  return Array.isArray(observables) && observables.length > 0 && observables.reduce(function (bool, observable) {
    return bool && isObservable(observable);
  }, true);
}

function createObjectValidator(message) {
  return function (obj) {
    /* istanbul ignore else */
    if (__DEV__) {
      (0, _invariant2['default'])(obj && typeof obj === 'object', message, obj);
    }
  };
}

function getName(comp) {
  return '' + (comp && comp.displayName || comp.constructor && comp.constructor.displayName || 'AnonymousComponent');
}

function isObservable(observable) {
  return observable && typeof observable.subscribe === 'function';
}

function isPromise(promise) {
  return promise && typeof promise.then === 'function';
}
module.exports = exports['default'];

},{"invariant":5}],22:[function(require,module,exports){
(function (global){
// # Wait For Utility
//
// Takes observables for arguments,
// converts them to hot observables
// then waits for each one to publish a value
//
// returns an observable.
//
// *Note:* it's good practice to use a firstOrDefault
// observable if you just want a short lived subscription
// and a timeout if you don't want to wait forever!
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = waitFor;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _rx = (typeof window !== "undefined" ? window.Rx : typeof global !== "undefined" ? global.Rx : null);

var _rx2 = _interopRequireDefault(_rx);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _utils = require('./utils');

var debug = (0, _debug2['default'])('thundercats:waitFor');
var slice = Array.prototype.slice;

function waitFor(observables) {
  return _rx2['default'].Observable.from(arguments).tapOnNext(function (observable) {
    return (0, _utils.isObservable)(observable) ? true : new Error('waitFor only take observables but got %s', observable);
  }).map(function (observable) {
    return observable.publish();
  }).tapOnNext(function (observable) {
    return observable.connect();
  }).toArray().tap(function () {
    return debug('starting waitFor');
  }).flatMap(function (arrayOfObservables) {
    return _rx2['default'].Observable.combineLatest(arrayOfObservables, function () {
      return slice.call(arguments);
    });
  }).doOnNext(function () {
    return debug('waitFor onNext!');
  });
}

module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./utils":21,"debug":2}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _Actions = require('./Actions');

var _Actions2 = _interopRequireDefault(_Actions);

var _Cat = require('./Cat');

var _Cat2 = _interopRequireDefault(_Cat);

var _Store = require('./Store');

var _Store2 = _interopRequireDefault(_Store);

var _createContainer = require('./createContainer');

var _createContainer2 = _interopRequireDefault(_createContainer);

var _waitFor = require('./waitFor');

var _waitFor2 = _interopRequireDefault(_waitFor);

exports['default'] = {
  Actions: _Actions2['default'],
  Cat: _Cat2['default'],
  createContainer: _createContainer2['default'],
  Store: _Store2['default'],
  waitFor: _waitFor2['default']
};
module.exports = exports['default'];

},{"./Actions":14,"./Cat":15,"./Store":18,"./createContainer":20,"./waitFor":22}]},{},[23])(23)
});