# {%= name %}

> {%= description %}

{%= toc %}

## What it does

Basically, it translates keys into texts.  It also can handle multiple languages, multiple domains for a language (think of scopes for languages, where keys don't overwrite keys from other scopes) as well as interpolate variables and various functions.

## Quickstart

It's really easy to get started.  See the following code for a short example of how to use `{%= name %}`:

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

`{%= name %}` supports lazy loading of lexicon files due to it's origin.  Usability of this feature depends on your exact use case.

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

If you want to extend `{%= name %}` or want to use more advanced features, check the following API reference for in-depth details.

{%= _.doc("api.tmpl.md") %}

## License and Copyright
{%= copyright %}
{%= license %}