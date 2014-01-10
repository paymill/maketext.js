

<!-- Start src/maketext.js -->

## new maketext(opts)

maketext constructor

### Options object explained

#### `loadTimeout`
Milliseconds to wait for the server to respond with the language file.
Defaults to 20000.

#### `base_url`
Base URL to load language files from the server.

#### `fallbackLanguages`
Array of fallback languages to use when the requested language is not
available while calling getHandle.
Defaults to:
    ['*', 'i-default', 'en', 'en-US']

#### `languages`
Array of languages that should be available (required when no `lexicons` provided)

#### `lexicons`
Object with lexicon per language:

    { 'en-gb': { default: { key: 'value with variable [_1]' } } }

#### `defaultDomain`
Domain to search in for lexicon keys, defaults to:

    '*'

### Params: 

* **object** *opts* Options object

## lexicon(lang, base, lexicon)

Inject a lexicon with a language key

### Params: 

* **string** *lang* Language key to associate the lexicon with

* **string** *base* (Optional) Language key of a lexicon that will be used as

* **object** *lexicon* Object containing lexicon data: `{ domain: { key: value }}`

## getHandle(opts)

Gets a handle for a language and executes callbacks.  Will load unloaded lexicons

### Options object explained

#### `lang`
Defined the language to get the handle for.  Falls back to `navigator.language` or
`navigator.browserLanguage`

#### `onSuccess`
Success callback function which is called with an instance of `maketext.Handle`.

#### `onError`
Errpr callback function which is called without any parameter on an error
(timeout when loading language files from the server).

### Params: 

* **object** *opts* Options object

## _load(lang, onSuccess, onError)

Loads a language and fires success or error events

### Params: 

* **string** *lang* Language, eg. 'en-us'

* **callback** *onSuccess* Will be called on successful loading

* **callback** *onError* Will be called on an error (eg. language file taking to long to load)

## _lexicon_aux(lang, lexobj, lexicon)

Actually sets the lexicon internally, calls success callbacks and clears timeout timer

### Params: 

* **string** *lang* Language key to associate the lexicon with

* **object** *lexobj* Object of the base that will be copied and extended

* **object** *lexicon* Object containing lexicon data: `{ domain: { key: value }}`

## _resolve_lang(lang)

Tries to resolve a language an eventually falls back to the
fallback language when nothing could be resolved.

When you pass 'de-de' as `lang` and only have loaded 'de',
this function will find it, because it tries to search
for the beginning parts of the language if the exact
language couldn't be found.

### Params: 

* **string** *lang* Language, eg. 'de' or 'en-gb'

### Return:

* **string** Language that has been found

## _cloneObject(obj)

Helper function to clone an object

### Params: 

* **object** *obj* Object to be cloned

### Return:

* **object** Cloned object

## new maketext.Handle(lexicon, defaultDomain)

Representing a lexicon handle

### Params: 

* **object** *lexicon* Lexicon object from `maketext`

* **string** *defaultDomain* Default domain from `maketext`

## maketext(id, value, [options])

Translates a key to a text

### Params: 

* **string** *id* The lexicon key to be translated

* **string|int** *value* Value to be replaced with placeholders (can be repeated)

* **object** *[options]* (Optional) More options, currently only supporting `{ domain: 'lexicon-domain' }`

### Return:

* **string** Translated string

## failWith(id, value, [options])

Does something when a key or domain hasn't been found in the lexicon.
Gets passed the same arguments as the `maketext` function.  Default is
to prefix the given language key with '? '.  Overwrite this if the
behavior should be changed.

### Params: 

* **string** *id* The lexicon key to be translated

* **string|int** *value* Value to be replaced with placeholders (can be repeated)

* **object** *[options]* (Optional) More options, currently only supporting `{ domain: 'lexicon-domain' }`

### Return:

* **string** `id` prefixed with '? '

## quant(value, singular, plural, zero)

Compiles, interpolates and returns a string depending on the number given

### Params: 

* **int** *value* The number to check

* **string** *singular* If `value` is 1, this will be returned

* **string** *plural* If `value`is > 1 or 0 and `zero` is not given, this will be used

* **string** *zero* (Optional) If `value` is 0, this will be used

### Return:

* **string** Compiled and interpolated string

## compile(str)

Compiles a string, aka preparation for interpolation

### Params: 

* **string** *str* String containing variables

### Return:

* **function** Reference to a function, which can be called with parameters that get interpolated

<!-- End src/maketext.js -->

<!-- Start src/parser.js -->

<!-- End src/parser.js -->

