/*! maketext.js - v0.1.0 - 2014-01-09
* https://github.com/paymill/maketext.js
* GPL licensed; Copyright (c) 2014 Matthias Dietrich / PAYMILL GmbH / Coma-systems Co. Ltd. */
/*!
 * maketext.js
 * https://github.com/paymill/maketext.js
 * GPL licensed
 *
 * Copyright (C) 2009 Coma-systems Co. Ltd.
 * Copyright (C) 2013 PAYMILL GmbH
 */

'use strict';

/**
 * maketext constructor
 *
 * @param  {object} opts Options object
 *
 * ### Options object explained
 *
 * #### `loadTimeout`
 * Milliseconds to wait for the server to respond with the language file.
 * Defaults to 20000.
 *
 * #### `base_url`
 * Base URL to load language files from the server.
 *
 * #### `fallbackLanguages`
 * Array of fallback languages to use when the requested language is not
 * available while calling getHandle.
 * Defaults to ['*', 'i-default', 'en', 'en-US']
 *
 * #### `languages`
 * Array of languages that should be available (required when no `lexicons` provided)
 *
 * #### `lexicons`
 * Object with lexicon per language: `{ 'en-gb': { default: { key: 'value' } } }`
 */
var maketext = function(opts) {
    if (!opts) opts = {};

    this._loadTimeout       = opts.loadTimeout || 20000; // time to wait for loading script (msec)
    this._base_url          = opts.base_url || "";
    this._fallbackLanguages = opts.fallbackLanguages || ['*', 'i-default', 'en', 'en-US'];
    this._lexicons          = {};
    this._callbacks         = {};

    // Preload lexicons, if given, and use languages from it
    // or just load languages.  One of these is mandatory.
    this._languages = {};
    var langs = opts.languages;
    if (opts.lexicons) {
        var key;
        for (key in opts.lexicons) this._languages[key] = true;
        for (key in opts.lexicons) this.lexicon(key, opts.lexicons[key]);
    } else if (!(langs instanceof Array) || langs.length === 0) {
        throw new Error("languages must not be empty");
    } else {
        for (var i = 0; i < langs.length; i++) this._languages[langs[i]] = true;
    }
};

maketext.prototype = {

    /**
     * Loads a language and fires success or error events
     *
     * @param  {string}   lang      Language, eg. 'en-us'
     * @param  {callback} onSuccess Will be called on successful loading
     * @param  {callback} onError   Will be called on an error (eg. language file taking to long to load)
     *
     * @return {null}
     */
    _load: function(lang, onSuccess, onError) {

        // Variable checking
        if (typeof onSuccess !== "function") {
            throw new TypeError("`" + onSuccess + "' is not a function");
        }
        if (arguments.length >= 3 && typeof onError !== "function") {
            throw new TypeError("`" + onError + "' is not a function");
        }

        // Fire success callback when language already loaded
        if (this._lexicons.hasOwnProperty(lang)) return onSuccess();

        // Only add success and error callbacks when trying
        // to load a language twice
        if (this._callbacks.hasOwnProperty(lang)) {
            this._callbacks[lang].onSuccess.push(onSuccess);
            if (onError) this._callbacks[lang].onError.push(onError);
            return;
        }

        // Load scripts from server by injecting a script-tag
        var self = this;
        this._callbacks[lang] = {
            onSuccess: [onSuccess],
            onError: onError ? [onError] : [],
            timer: setTimeout(function() {
                var onError = self._callbacks[lang].onError;
                for (var i = 0; i < onError.length; i++) {
                    onError[i]();
                }
                delete self._callbacks[lang];
            }, this._loadTimeout)
        };
        var script  = document.createElement("script");
        script.type = "text/javascript";
        script.src  = this._base_url + lang + ".js";
        (document.getElementsByTagName("head")[0] || document.body || document).appendChild(script);
    },

    /**
     * Inject a lexicon with a language key
     *
     * @param  {string} lang    Language key to associate the lexicon with
     * @param  {string} base    (Optional) Language key of a lexicon that will be used as
     *                          base for the new lexicon; will get loaded if not already loaded
     * @param  {object} lexicon Object containing lexicon data: `{ domain: { key: value }}`
     *
     * @return {null}
     */
    lexicon: function(lang, base, lexicon) {
        if (typeof base !== "string") {
            lexicon = base;
            base    = null;
        }

        // If new lexicon should be based on another one, use the _load function
        if (base) {
            var self = this;
            this._load(base,
                function() {
                    self._lexicon_aux(lang, this._cloneObject(self._lexicons[base]), lexicon);
                },
                function() {
                    throw new Error("Can't load lexicon file for `" + lang + "'");
                }
            );
        } else {
            this._lexicon_aux(lang, {}, lexicon);
        }
    },

    /**
     * Actually sets the lexicon internally, calls success callbacks and clears timeout timer
     *
     * @param  {string} lang    Language key to associate the lexicon with
     * @param  {object} lexobj  Object of the base that will be copied and extended
     * @param  {object} lexicon Object containing lexicon data: `{ domain: { key: value }}`
     *
     * @return {null}
     */
    _lexicon_aux: function(lang, lexobj, lexicon) {
        var i;

        // Merge lexicon into base
        for (i in lexicon) {
            if (lexicon.hasOwnProperty(i)) lexobj[i] = lexicon[i];
        }

        // Assign lexicon to language
        this._lexicons[lang] = lexobj;

        // No callbacks => finished
        if (!this._callbacks.hasOwnProperty(lang)) return;

        // Clear timeout timer and call all success callbacks
        var callbacks = this._callbacks[lang];
        delete this._callbacks[lang];
        clearTimeout(callbacks.timer);

        for (i = 0; i < callbacks.onSuccess.length; i++) {
            callbacks.onSuccess[i]();
        }
    },

    /**
     * Gets a handle for a language and executes callbacks.  Will load unloaded lexicons
     *
     * @param  {object} opts Options object
     *
     * ### Options object explained
     *
     * #### `lang`
     * Defined the language to get the handle for.  Falls back to `navigator.language` or
     * `navigator.browserLanguage`
     *
     * #### `onSuccess`
     * Success callback function which is called with an instance of `maketext.Handle`.
     *
     * #### `onError`
     * Errpr callback function which is called without any parameter on an error
     * (timeout when loading language files from the server).
     */
    getHandle: function(opts) {
        opts          = opts || {};
        var lang      = this._resolve_lang(opts.lang || navigator.language || navigator.browserLanguage);
        var onSuccess = opts.onSuccess;
        var onError   = opts.onError;
        var self      = this;

        function success() {
            onSuccess(new maketext.Handle(self._lexicons[lang]));
        }

        function error() {
            if (typeof onError === "function") {
                onError();
            } else {
                throw new Error("Can't load lexicon file for `" + lang + "'");
            }
        }

        this._load(lang, success, error);
    },

    _resolve_lang: function(lang) {
        var langs = String(lang).match(/(\w+(?:-\w+)*)/g) || [], i;

        for (i = 0; i < langs.length; i++) {
            if (this._languages.hasOwnProperty(langs[i])) {
                return langs[i];
            }
        }
        for (i = 0; i < langs.length; i++) {
            var tmp = String(langs[i]).split(/-/);
            tmp.pop();
            while (tmp.length) {
                var superordinate = tmp.join("-");
                if (this._languages.hasOwnProperty(superordinate)) {
                    return superordinate;
                }
                tmp.pop();
            }
        }
        langs = this._fallbackLanguages;
        for (i = 0; i < langs.length; i++) {
            if (this._languages.hasOwnProperty(langs[i])) {
                return langs[i];
            }
        }
        throw new Error("No language to load was found for `" + lang + "'");
    },

    /**
     * Helper function to clone an object
     *
     * @param  {object} obj Object to be cloned
     * @return {object}     Cloned object
     */
    _cloneObject: function(obj) {
        function Temp() {};
        Temp.prototype = obj;
        return new Temp();
    }
};

/**
 * Representing a lexicon handle
 *
 * @param {object} lexicon Lexicon object from `maketext`
 */
maketext.Handle = function(lexicon) {
    this._lexicon = lexicon;
};

maketext.Handle.prototype = {

    /**
     * Translates a key to a text
     *
     * @param  {string}     id  The lexicon key to be translated
     * @param  {string|int} ... Value to be replaced with placeholders (can be repeated)
     *
     * @return {string}         Translated string
     */
    maketext: function(id) {
        if (typeof this._lexicon[id] !== "function") {
            this._lexicon[id] = this.compile(this._lexicon[id]);
        }
        var args = Array.prototype.slice.call(arguments, 1);
        args.unshift(this);
        return this._lexicon[id].apply(this, args);
    },

    /**
     * Compiles, interpolates and returns a string depending on the number given
     *
     * @param {int}     The number to check
     * @param {string}  If number is 1, this will be returned
     * @param {string}  If number is > 1 or 0 and 4th parameter is not given, this will be used
     * @param {string}  If number is 0, this will be used
     *
     * @return {string} Compiled and interpolated string
     */
    quant: function() {
        var quantTemplate = arguments[1] == '1' ? arguments[2] : arguments[3];
        if (arguments[1] == '0' && arguments[4]) quantTemplate = arguments[4];
        quantTemplate = quantTemplate.replace(/(_\d+)/g, '[$1]');

        return this.compile(quantTemplate).apply(this, [this, arguments[1]]);
    },

    /**
     * Compiles a string, aka preparation for interpolation
     *
     * @param  {string}   str String containing variables
     * @return {function}     Reference to a function, which can be called with parameters that get interpolated
     */
    compile: function(str) {
        var ctx = (new Parser(str)).parse();
        return eval("0, function(){ return " + ctx.val.compile() + "; }");
    }
};;/*!
 * maketext.js
 * https://github.com/paymill/maketext.js
 * GPL licensed
 *
 * Copyright (C) 2009 Coma-systems Co. Ltd.
 * Copyright (C) 2013 PAYMILL GmbH
 */

'use strict';

function Lit(str) {
    this.str = String(str);
}

Lit.prototype.compile = function() {
    return '"' + this.str.replace(/(["\\\b\f\n\r\t\v\u2028\u2029])/g, function(c) {
        switch (c) {
        case "\b":
            return "\\b";
        case "\f":
            return "\\f";
        case "\n":
            return "\\n";
        case "\r":
            return "\\r";
        case "\t":
            return "\\t";
        case "\v":
            return "\\v";
        case "\u2028":
            return "\\u2028";
        case "\u2029":
            return "\\u2029";
        default:
            return "\\" + c;
        }
    }) + '"';
};

function Seq(arr) {
    this.seq = arr || [];
}

Seq.prototype = {
    add: function() {
        return this.seq.push.apply(this.seq, arguments);
    },

    concat: function(that) {
        return new Seq(this.seq.concat(that.seq));
    },

    compile: function() {
        var buf = [];
        for (var i = 0; i < this.seq.length; i++) {
            buf.push(this.seq[i].compile());
        }
        return "[" + buf.join(",") + "].join('')";
    }
};

function Ref(idx) {
    this.idx = Number(idx) || 0;
}

Ref.prototype.compile = function() {
    if (this.idx < 0) {
        return "arguments[arguments.length + " + this.idx + "]";
    } else {
        return "arguments[" + this.idx + "]";
    }
};

function Call(name, args) {
    this.name = String(name);
    this.args = args || [];
}

Call.prototype = {
    add: function() {
        this.args.push.apply(this.args, arguments);
    },

    compile: function() {
        var buf = ["this"];
        for (var i = 0; i < this.args.length; i++) {
            buf.push(this.args[i].compile());
        }
        return "this." + this.name + "(" + buf.join(",") + ")";
    }
};

var Parser = function Parser(str, pos, val) {
    this.str = String(str);
    this.pos = Number(pos) || 0;
    this.val = val;
}

Parser.prototype = {

    toString: function() {
        return this.str.slice(0, this.pos) + " <-- HERE --> " + this.str.slice(this.pos);
    },

    error: function(msg) {
        throw new SyntaxError(msg + ": " + this.toString());
    },

    isEOS: function() {
        return this.pos >= this.str.length;
    },

    stepTo: function(pos) {
        return new Parser(this.str, Number(pos) || 0, this.val);
    },

    stepBy: function(pos) {
        return new Parser(this.str, this.pos + Number(pos) || 0, this.val);
    },

    charAt: function(pos) {
        pos = Number(pos);
        if (isNaN(pos)) pos = this.pos;
        return this.str.charAt(pos);
    },

    value: function(v) {
        return new Parser(this.str, this.pos, v);
    },

    match: function(regex) {
        if (!(regex instanceof RegExp)) regex = new RegExp(regex, "g");
        regex.lastIndex = this.pos;
        var m = regex.exec(this.str);
        if (m) {
            return this.stepBy(m[0].length).value(m);
        } else {
            return this.value(m);
        }
    },

    parse: function() {
        var seq = new Seq();
        var ctx = this;
        while (!ctx.isEOS()) {
            ctx = ctx.match(/[^\[~]*(?:~[\[\],~]?[^\[~]*)*/g);
            var str = ctx.val[0];
            if (str) {
                seq.add(new Lit(this.unescape(str)));
            }
            ctx = ctx.parse_bracket();
            if (ctx.val) seq.add(ctx.val);
        }
        return ctx.value(seq);
    },

    parse_bracket: function() {
        if (this.charAt() !== '[') return this.value(null);
        var ctx = this.stepBy(1);
        ctx = ctx.parse_method();
        var bracket = ctx.val;
        while (ctx.charAt() === ',') {
            ctx = ctx.stepBy(1).parse_arg();
            bracket.add(ctx.val);
        }
        if (ctx.charAt() !== ']') {
            this.error("unmatched `['");
        }
        ctx = ctx.stepBy(1);
        if (bracket instanceof Seq && bracket.seq.length === 0) {
            return ctx.value(null);
        }
        return ctx.value(bracket);
    },

    parse_method: function() {
        var ctx = this.match(/_(-?\d+)|_\*|\*|\#|[a-zA-Z_$]\w*|/g);
        var m = ctx.val;
        switch (ctx.str.charAt(ctx.pos)) {
            case ',':
            case ']':
                break;
            default:
                ctx.error("unknown context");
        }
        if (m[1]) {
            return ctx.value(new Seq([new Ref(m[1])]));
        } else {
            switch (m[0]) {
                case "":
                    return ctx.value(new Seq());
                case "_*":
                    ctx.error("`_*' is not supported");
                    break;
                case "*":
                    return ctx.value(new Call("quant"));
                case "#":
                    return ctx.value(new Call("numf"));
                default:
                    return ctx.value(new Call(m[0]));
            }
        }
    },

    parse_arg: function() {
        var arg = new Seq();
        var ctx = this;
        while (!ctx.isEOS()) {
            ctx = ctx.match(/[^\[\],~]*(?:~[\[\],~]?[^\[\],~]*)*/g);
            var str = ctx.val[0];
            if (str) {
                var m;
                if (m = str.match(/^_(-?\d+)$/)) {
                    arg.add(new Ref(m[1]));
                } else if (str === "_*") {
                    throw new SyntaxError("`_*' is not supported");
                } else {
                    arg.add(new Lit(this.unescape(str)));
                }
            }
            switch (ctx.charAt()) {
            case '[':
                ctx = ctx.parse_bracket();
                if (ctx.val) arg.add(ctx.val);
                break;
            case ',':
            case ']':
                return arg.seq.length === 0 ? ctx.value(new Lit("")) :
                    arg.seq.length === 1 ? ctx.value(arg.seq[0]) :
                    ctx.value(arg);
            }
        }
        ctx.error("unmatched `['");
    },

    unescape: function(s) {
        return String(s).replace(/~([\[\],~])/g, "$1");
    }
};