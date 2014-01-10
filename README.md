# maketext.js

> JavaScript port of Sean M. Burke's Maketext

* [What it does](#what-it-does)
* [Quickstart](#quickstart)
* [Lazy loading](#lazy-loading)
* [Implementing own functions](#implementing-own-functions)
* [`failWith` function: how to handle missing text](#failwith-function-how-to-handle-missing-text)
* [API reference](#api-reference)
* [License and Copyright](#license-and-copyright)


## What it does

Basically, it translates keys into texts.  It also can handle multiple languages, multiple domains for a language (think of scopes for languages, where keys don't overwrite keys from other scopes) as well as interpolate variables and various functions.

## Quickstart

It's really easy to get started.  See the following code for a short example of how to use `maketext.js`:

    // A place to store the language handle
    var langHandle;

    // Instantiate maketext and retrieve the handle for the 'en-gb' language
    var mtInstance = new maketext({
        fallback_languages: ['en-gb'],
        lexicons: {
            'en-gb': {
                '*': {
                    'Welcome.Msg': 'Welcome, [_1]!',
                    'Welcome.Mail.Count': 'You have' +
                        ' [quant,_1,one new mail,_1 new mails,no new mails]' +
                        ' in your inbox'
                }
            },
            'de-de': {
                '*': {
                    'Welcome.Msg': 'Willkommen, [_1]!',
                    'Welcome.Mail.Count': 'Du hast' +
                        ' [quant,_1,eine neue Nachricht,_1 neue Nachrichten,keine neue Nachrichten]' +
                        ' in your inbox'
                }
            }
        }
    });
    mtInstance.getHandle({
        lang: 'en-gb',
        onSuccess: function(handle) { langHandle = handle }
    });

    // Translate something
    var transWelcome   = langHandle.maketext('Welcome.Msg', ['user']);
    //  --> 'Welcome, user!'

    var transMailcount = langHandle.maketext('Welcome.Mail.Count', [5]);
    //  --> 'You have 5 new mails in your inbox'

## Lazy loading

`maketext.js` supports lazy loading of lexicon files due to it's origin.  Usability of this feature depends on your exact use case.

To lazy load lexicon files, do the following:

* pass an array called `languages` containing language keys to the constructor
* remove the option `lexicons`
* pass the option `baseUrl`, which defines the base for language files (relative or absolute)
* add language files to your server containing calls to `lexicon`

Example for a file `en-gb.js`:

    mtInstance.lexicon("en-gb", {
        '*': {
            'Welcome.Msg': 'Welcome, [_1]!',
            'Welcome.Mail.Count': 'You have' +
                ' [quant,_1,one new mail,_1 new mails,no new mails]' +
                ' in your inbox'
        }
    });

## Implementing own functions

Currently only the `quant` function is implemented for usage in texts.  You can implement your own function by extending each handle.  Functions inlined into translations can be added like the following:

	var langHandle;
	var mtInstance = new maketext({
		lexicons: {
			'en-gb': {'*': {'Increase': 'This increases [_1] to [increase,_1]'}}
		}
	});
    mtInstance.getHandle({
        lang: 'en-gb',
        onSuccess: function(handle) { langHandle = handle }
    });
    
    // Add function `increase`
    langHandle.increase = function() { return arguments[1] + 1 }
    
    langHandle.maketext('Increase', 2);
    //   --> 'This increases 2 to 3'

## `failWith` function: how to handle missing text

Each handle as a `failWith` function that is called each time a translation for a key is not found.  You can overwrite it to take advantage from it, eg. send the missing string to the server which is notifying your developers of missing text.  It gets all the parameters which the `maketext` function of the handle gets passed (see [API reference](#api-reference) below) and has access to `this` (of course ;-)).

The default behaviour is to prefix the language key with `? ` and return it.  Given the key `Welcome.Msg` results in `? Welcome.Msg`.

	var langHandle;
	var mtInstance = new maketext({ /* ... as usual ... */ });
    mtInstance.getHandle({
        lang: 'en-gb',
        onSuccess: function(handle) { langHandle = handle }
    });
    
    // Overwrite `failWith` (note: don't alert!):
    langHandle.failWith = function() { alert('Key missing: ' + arguments[0]) }
    
    langHandle.maketext('Does.Not.Exist');
    //   --> alerts 'Key missing: Does.Not.Exist'

## API reference

If you want to extend `maketext.js` or want to use more advanced features, check the following API reference for in-depth details.



<!-- Start src/maketext.js -->

### new maketext(opts)

maketext constructor

#### Options object explained

##### `loadTimeout`
Milliseconds to wait for the server to respond with the language file.
Defaults to 20000.

##### `baseUrl`
Base URL to load language files from the server.

##### `fallbackLanguages`
Array of fallback languages to use when the requested language is not
available while calling getHandle.
Defaults to:
    ['*', 'i-default', 'en', 'en-US']

##### `languages`
Array of languages that should be available (required when no `lexicons` provided)

##### `lexicons`
Object with lexicon per language:

    { 'en-gb': { default: { key: 'value with variable [_1]' } } }

##### `defaultDomain`
Domain to search in for lexicon keys, defaults to:

    '*'

#### Params: 

* **object** *opts* Options object

### lexicon(lang, base, lexicon)

Inject a lexicon with a language key

#### Params: 

* **string** *lang* Language key to associate the lexicon with

* **string** *base* (Optional) Language key of a lexicon that will be used as

* **object** *lexicon* Object containing lexicon data: `{ domain: { key: value }}`

### getHandle(opts)

Gets a handle for a language and executes callbacks.  Will load unloaded lexicons

#### Options object explained

##### `lang`
Defined the language to get the handle for.  Falls back to `navigator.language` or
`navigator.browserLanguage`

##### `onSuccess`
Success callback function which is called with an instance of `maketext.Handle`.

##### `onError`
Errpr callback function which is called without any parameter on an error
(timeout when loading language files from the server).

#### Params: 

* **object** *opts* Options object

### _load(lang, onSuccess, onError)

Loads a language and fires success or error events

#### Params: 

* **string** *lang* Language, eg. 'en-us'

* **callback** *onSuccess* Will be called on successful loading

* **callback** *onError* Will be called on an error (eg. language file taking to long to load)

### _lexicon_aux(lang, lexobj, lexicon)

Actually sets the lexicon internally, calls success callbacks and clears timeout timer

#### Params: 

* **string** *lang* Language key to associate the lexicon with

* **object** *lexobj* Object of the base that will be copied and extended

* **object** *lexicon* Object containing lexicon data: `{ domain: { key: value }}`

### _resolve_lang(lang)

Tries to resolve a language an eventually falls back to the
fallback language when nothing could be resolved.

When you pass 'de-de' as `lang` and only have loaded 'de',
this function will find it, because it tries to search
for the beginning parts of the language if the exact
language couldn't be found.

#### Params: 

* **string** *lang* Language, eg. 'de' or 'en-gb'

#### Return:

* **string** Language that has been found

### _cloneObject(obj)

Helper function to clone an object

#### Params: 

* **object** *obj* Object to be cloned

#### Return:

* **object** Cloned object

### new maketext.Handle(lexicon, defaultDomain)

Representing a lexicon handle

#### Params: 

* **object** *lexicon* Lexicon object from `maketext`

* **string** *defaultDomain* Default domain from `maketext`

### maketext(id, value, [options])

Translates a key to a text

#### Params: 

* **string** *id* The lexicon key to be translated

* **string|int** *value* Value to be replaced with placeholders (can be repeated)

* **object** *[options]* (Optional) More options, currently only supporting `{ domain: 'lexicon-domain' }`

#### Return:

* **string** Translated string

### failWith(id, value, [options])

Does something when a key or domain hasn't been found in the lexicon.
Gets passed the same arguments as the `maketext` function.  Default is
to prefix the given language key with '? '.  Overwrite this if the
behavior should be changed.

#### Params: 

* **string** *id* The lexicon key to be translated

* **string|int** *value* Value to be replaced with placeholders (can be repeated)

* **object** *[options]* (Optional) More options, currently only supporting `{ domain: 'lexicon-domain' }`

#### Return:

* **string** `id` prefixed with '? '

### quant(value, singular, plural, zero)

Compiles, interpolates and returns a string depending on the number given

#### Params: 

* **int** *value* The number to check

* **string** *singular* If `value` is 1, this will be returned

* **string** *plural* If `value`is > 1 or 0 and `zero` is not given, this will be used

* **string** *zero* (Optional) If `value` is 0, this will be used

#### Return:

* **string** Compiled and interpolated string

### compile(str)

Compiles a string, aka preparation for interpolation

#### Params: 

* **string** *str* String containing variables

#### Return:

* **function** Reference to a function, which can be called with parameters that get interpolated

<!-- End src/maketext.js -->

<!-- Start src/parser.js -->

<!-- End src/parser.js -->




## License and Copyright
Copyright (c) 2014 PAYMILL GmbH (Matthias Dietrich) / Coma-systems Co. Ltd., contributors.
Released under the GPL license