const fs = require( 'fs' );
const docblock = require( 'docblock' );
const glob = require( 'glob-fs' )({ gitignore: false });
const config = require( './hookster-config.json' );
const json2md = require("json2md")

const namespace = config.namespace; // All hook names must start with this.

const hooks = [];

const docBlockInstance = new docblock({
    skipMarkdown: true
});

const files = glob.readdirSync( config.src );

// Output header
const markdown = [];
markdown.push({ h1: "Hooks and actions" });


// Process Files
files.forEach( function( file ) {
    let content = fs.readFileSync( file, 'utf8' );
    let result = docBlockInstance.parse( content, 'js' ); // The docblock package will only parse parameters with the JavaScript rules.
    let isFirstInFile = true;
    result.forEach( function( itemData, ind ) {
        const item = addItem( file, itemData );
        if (item) {
            if (isFirstInFile) {
                item.isFirstInFile = true;
                isFirstInFile = false;
            }
            hooks.push(item)
        }
    } );

} );


// Make Markdown
// @see https://www.npmjs.com/package/json2md
hooks.forEach(function (item){
    if (item.isFirstInFile) {
        markdown.push({ p: '**' + item.file + '**' });
    }
    markdown.push({
        h2: item.name
    });
    markdown.push({ p: '**' + item.summary + '**' });
    markdown.push({ p:  item.desc });

    markdown.push( {
        "code": {
            language: "php"
            , content: [item.raw + item.signature]
        }
    })
    markdown.push({ p: '<small>Since: ' + item.since + '</small>'});

});

// Done
fs.writeFileSync(config.dest, json2md(markdown), 'utf8' );
console.log(json2md(markdown));


/**
 * Add an action or filter to the data constant.
 */
function addItem( file, itemData ) {

    let item = {};
    let type = getType( itemData );

    if ( type && itemData.tags ) {

        item.name = getName( type, itemData.code );
        item.type = type;

        let info = getInfo( itemData );

        item.summary = info.summary;

        item.desc = info.desc;

        item.since = getSince( itemData );

        item.params = getParams( itemData );

        item.file = file.replace( 'src/', '' );

        // item.raw = .map(() => trim(line))
        let trimmedLines = '';
        itemData.raw.split(/\r?\n/).forEach(function (elm, ind, arr){
            const prefix = ind > 0 ? ' ' : '';
            let content = elm.trim();
            if (content === '*/') {
                // Add a file tag
                content = '*\n * @file ' + item.file.slice(3) + ':' + itemData.pos + "\n " + content;
            }
              trimmedLines += prefix + content + "\n";
        })
        item.raw = trimmedLines;
        item.signature = getSignature(item);


        /*
         * Check for validity and add hook. A hook must have
         * at least a name and a summary.
         */
         if ( item.name  ) { // && item.summary
            return item;
         }
    }
    return null;
}

function getSignature(item) {
    let signature = ''
    switch (item.type) {
        case 'action':
            signature = 'add_action(\'' + item.name + '\',';
            break;
        case 'filter':
            signature = 'add_filter(\'' + item.name + '\','
            break;
    }
    item.params.forEach(function (param) {
        signature += ' ' + param.name;
    })
    signature += ');'
    return signature;
}

/**
 * Determine the item type, action or filter.
 */
function getType( itemData ) {

    let type = '';

    if ( itemData.code ) {

        let code = itemData.code;

        code = code.split( '\n' );

        code = code[0];

        if ( code ) {

            if ( code.startsWith( 'do_action' ) ) {
                type = 'action';
            } else if ( code.includes( 'apply_filters' ) ) {
                type = 'filter';
            }
        }
    }

    return type;

}

/**
 * Format a hook name.
 */
function getName( type, code ) {

    let name = '';

    let start = 'filter' == type ? 'apply_filters(' : 'do_action(';

    code = code.replace( /\n/g, '' );

    code = code.replace(/\s+/g, '');

    code = code.replace( /['"]+/g, '' );

    code = code.replace( /\)/g, ',)' );

    name = code.substring(
        code.indexOf( start ) + start.length,
        code.indexOf( ',' )
    );

    if ( name.includes( '.' ) ) {

        name = name.split( '.' );

        if ( 3 == name.length ) {
            name = name[0] + '{' + name[1] + '}' + name[2];
        } else if ( 2 == name.length ) {
            name = name[0] + '{' + name[1] + '}';
        }
    }

    if ( ! name.startsWith( namespace ) ) {
        return false;
    }

    return name;

}

/**
 * Parse out the summary and description from the
 * raw data of the docBlock and return it in an
 * info object.
 */
function getInfo( itemData ) {

    let info = {
        summary: '',
        desc: ''
    };

    /*
     * The goal is to get the summary and description to be
     * an array of paragraphs in rawData.
     */
    let rawData = itemData.raw;

    rawData = rawData.replace( /\t|\n/g, '' ); // Remove all the tabs and all line breaks; then we can rely on just where the asterix are.
    rawData = rawData.replace(/\s\s+/g, ' '); // Clean up white-spaces.
    rawData = rawData.replace( '/** * ', '' ); // Remove the docBlock's starting code.
    rawData = rawData.replace( / \* /g, ' ' ); // Single line breaks should be treated as just normal spaces.
    rawData = rawData.split( ' * ' );

    let deleteStart = 0;
    for ( let i = 0; i < rawData.length; i++ ) {
        if ( rawData[ i ].charAt(0) == '@' ) {
            deleteStart = i;
            break;
        }
    }

    rawData.splice( deleteStart );

    if ( rawData[0] ) {
        info.desc = rawData.splice(1).join( '\n\n' );
        info.summary = rawData[0];
    }

    return info;

}

/**
 * Format a hook's since version number.
 */
function getSince( itemData ) {

    let since = '';

    if ( itemData.tags.since ) {

        since = itemData.tags.since.replace( 'Theme_Blvd', 'Theme Blvd Framework' );

        since = since.replace( 'Jump_Start', 'Jump Start' );

    }

    return since;

}

/**
 * Format hook parameters.
 *
 * This gets a bit funky because in order for the
 * docblock npm plugin to parse the parameters correctly,
 * we have to tell it that it's parsing JavaScript, when
 * we're actually parsing PHP.
 *
 * And then because of this, the object is pretty messed up
 * and we have to parse it out and flip things around the
 * way we want.
 *
 * @TODO A current problem is that array descriptions and
 * inner items do not get parsed. We may need to adjust
 * how our docblock array values are formatted, which will
 * stray from WordPress.
 */
function getParams( itemData ) {

    let params = [];

    if ( itemData.tags.params ) {

        itemData.tags.params.forEach( function( input ) {

            let output = {
                name: '',
                type: '',
                description: ''
            };

            if ( input.name ) { // docblock plugin puts our type inside the name.
                output.type = input.name;
            }

            if ( 0 === input.description.indexOf( '$' ) ) {
                output.name = input.description.substring(
                    input.description.indexOf( '$' ),
                    input.description.indexOf( ' ' )
                );
            }

            output.description = input.description;

            if ( output.name ) {
                output.description = output.description.replace( output.name, '' );
            }

            output.description = output.description.replace( ' {', '' );

            output.description = output.description.trim();

            params.push( output );

        } );

    }

    return params;

}
