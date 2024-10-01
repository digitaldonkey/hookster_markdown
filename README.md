# Hookster

Hookster is a tool to automatically extract data about the actions and filters of your WordPress theme or plugin. You can use this data in any way you like... For example, you might use the data to create a developer documentation website.

Here's the gist of how this project works &mdash; Drop your WordPress theme or plugin files into the `src` directory, run `npm run build` in your terminal, and get back the files `actions.json` and `filters.json` with data about your hooks.

## About This Project

This is a fork of hookster allowing to document WordPress hooks. You can create a Marksown file from phpdoc documented hooks.

## Prerequisites

First things first, you must have Node and NPM installed on your computer.

<http://blog.teamtreehouse.com/install-node-js-npm-mac>

Next, let's talk about how the code in your WordPress theme or plugin needs to be set up to work with Hookster.

Hookster works by going through the [DocBlocks](http://docs.phpdoc.org/guides/docblocks.html) found across your theme or plugin's PHP files. The name of your hook is cleverly extracted from the PHP code immediately following each docBlock, and then information about the hook is taken from the docBlock, itself.

So in order for the data to be generated properly, your PHP code needs to follow [WordPress's PHP Documentation Standards](https://make.wordpress.org/core/handbook/best-practices/inline-documentation-standards/php/#4-hooks-actions-and-filters). For example:

``` php
/**
 * Summary.
 *
 * Description.
 *
 * @since x.x.x
 *
 * @param string $foo Description.
 * @param bool   $bar Description.
 */
do_action( 'my_plugin_do_something', $foo, $bar );

/**
 * Summary.
 *
 * Description.
 *
 * @since x.x.x
 *
 * @param string $foo Description.
 * @param bool   $bar Description.
 */
$something = apply_filters( 'my_plugin_modify_something', $foo, $bar );
```

*Note: Make sure all of your action and filter names are prefixed with your namespace. In the above examples, the namespace would be `my_plugin`.*

## Usage Instructions

1. Clone this repository to your local computer, navigate to the project in your terminal, and run `npm install` to install the required Node packages.
2. Open the project's `package.json`, find the `namespace` parameter, and change it to your theme or plugin's namespace. The namespace should be what you prefix all of your action and filter names with. Examples: `themename`, `pluginname`, `theme_name`, `plugin_name`, etc. **Only hook names prefixed with your namespace name will be found.**
3. Drop all of the files of your theme or plugin into the project's `src` directory.
4. Run the command `npm run build` in your terminal. After it's finished, you'll be able to find the files `actions.json` and `filters.json` in your project's `dist` directory.

## About the Data Generated

Resulting Markdown can be adapted easily in build.js. 

Output looks like the following example

---


@file **../src/App/Controller/DatabaseController.php**

### osec_dbi_debug <span style="text-transform: uppercase; font-size: small; color: darkgray"> filter</span>


Filter if debug mode should really be enabled [sic!]

```php
add_filter('osec_dbi_debug', $do_debug);
```

#### Description


Only attempt to enable debug after all add-ons are loaded.



Overriding OSEC_DEBUG in Ajax context. Used to disable debug an XHR requests as debug output would crash Json. @wp_hook ai1ec_loaded

#### Parameters


- **$do_debug** <span style="color:crimson"> bool</span> Debug or not.

<details markdown="1">
<summary>Source</summary>


```php
/**
 * Filter if debug mode should really be enabled [sic!]
 *
 * Only attempt to enable debug after all add-ons are loaded.
 *
 * Overriding OSEC_DEBUG in Ajax context.
 *  Used to disable debug an XHR requests as debug output would crash Json.
 * @wp_hook ai1ec_loaded
 *
 * @since 1.0
 *
 * @param bool $do_debug Debug or not.
 *
 *
 * @file src/App/Controller/DatabaseController.php
 */
add_filter('osec_dbi_debug', $do_debug);
```

</details>


## Creator

Markdown Version by digitaldonkey.

Originally brought to this world by 

**Jason Bobich**

* <http://jasonbobich.com>
* <https://twitter.com/jasonbobich>
* <http://themeblvd.com>
* <http://wpjumpstart.com>
