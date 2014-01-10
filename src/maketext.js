/*
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
 *
 * #### `defaultDomain`
 * Domain to search in for lexicon keys, defaults to: `*`
 */
var maketext = function(opts) {
    if (!opts) opts = {};

    this._loadTimeout       = opts.loadTimeout || 20000; // time to wait for loading script (msec)
    this._base_url          = opts.base_url || "";
    this._fallbackLanguages = opts.fallbackLanguages || ['*', 'i-default', 'en', 'en-US'];
    this._defaultDomain     = opts.defaultDomain || '*';
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
            onSuccess(new maketext.Handle(self._lexicons[lang], self._defaultDomain));
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

    /**
     * Tries to resolve a language an eventually falls back to the
     * fallback language when nothing could be resolved.
     *
     * @param  {string} lang Language, eg. 'de' or 'en-gb'
     * @return {string}      Language that has been found
     *
     * When you pass 'de-de' as `lang` and only have loaded 'de',
     * this function will find it, because it tries to search
     * for the beginning parts of the language if the exact
     * language couldn't be found.
     */
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
        function Temp() {}
        Temp.prototype = obj;
        return new Temp();
    }
};

/**
 * Representing a lexicon handle
 *
 * @param {object} lexicon       Lexicon object from `maketext`
 * @param {string} defaultDomain Default domain from `maketext`
 */
maketext.Handle = function(lexicon, defaultDomain) {
    this._lexicon       = lexicon;
    this._defaultDomain = defaultDomain;
};

maketext.Handle.prototype = {

    /**
     * Translates a key to a text
     *
     * @param  {string}     id  The lexicon key to be translated
     * @param  {string|int} ... Value to be replaced with placeholders (can be repeated)
     * @param  {object}     ... Optional, more options, currently only supporting `{ domain: 'lexicon-domain' }`
     *
     * @return {string}         Translated string
     */
    maketext: function(id) {
        var domain = this._defaultDomain,
            index, args;

        for (index in arguments) {
            if (Object.prototype.toString.call(arguments[index]) === '[object Object]' &&
                arguments[index].domain)
            {
                domain = arguments[index].domain;
            }
        }

        if (!(domain in this._lexicon) || !(id in this._lexicon[domain])) {
            return this.failWith.apply(this, arguments);
        }

        if (typeof this._lexicon[domain][id] !== "function") {
            this._lexicon[domain][id] = this.compile(this._lexicon[domain][id]);
        }

        args = Array.prototype.slice.call(arguments, 1);
        args.unshift(this);
        return this._lexicon[domain][id].apply(this, args);
    },

    /**
     * Does something when a key or domain hasn't been found in the lexicon.
     * Gets passed the same arguments as the `maketext` function.  Default is
     * to prefix the given language key with '? '.  Overwrite this if the
     * behavior should be changed.
     *
     * @param  {string}     id  The lexicon key to be translated
     * @param  {string|int} ... Value to be replaced with placeholders (can be repeated)
     * @param  {object}     ... Optional, more options, currently only supporting `{ domain: 'lexicon-domain' }`
     *
     * @return {string}    `id` prefixed with '? '
     */
    failWith: function(id) {
        return '? ' + id;
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
};