const fs = require('fs');
const docblock = require('docblock');
const glob = require('glob-fs')({gitignore: false});
const config = require('./hookster-config.json');
const json2md = require("json2md")

const namespace = config.namespace; // All hook names must start with this.
const isDebug = process.argv[2] === 'debug';

const hooks = [];

const docBlockInstance = new docblock({
    skipMarkdown: true
});

const files = [];
config.src.forEach((glob_pattern) => {
    glob.readdirSync(glob_pattern).forEach((f)=>{
        files.push(f)
    });

})
// const files = glob.readdirSync(config.src);

json2md.converters.detailsOpen = function (input, json2md) {
    return  '<details markdown="1">\n' +
        '<summary>Source</summary>\n';
}
json2md.converters.detailsClose = function (input, json2md) {
    return  '</details>\n';
}

// Output header
const markdown = [];
markdown.push({h1: 'Hooks and actions'});
markdown.push({p: 'Only custom Osec ations and filters. There are other common WP filters like "the_title" applied. [Documentation examples](https://github.com/pronamic/wp-documentor/blob/main/tests/source/actions.php)'});

// Process Files
files.forEach(function (file) {
    let content = fs.readFileSync(file, 'utf8');
    // Docblock package will only parse parameters with the JavaScript rules.
    let result = docBlockInstance.parse(content, 'js');
    let isFirstInFile = true;
    result.forEach(function (itemData, ind) {
        const item = addItem(file, itemData);
        if (item) {
            if (isFirstInFile) {
                item.isFirstInFile = true;
                isFirstInFile = false;
            }
            hooks.push(item)
        }
    });
});


// Make Markdown
// @see https://www.npmjs.com/package/json2md
hooks.forEach(function (item, index) {
    if (item.isFirstInFile) {
        markdown.push({hr: ''})
        markdown.push({p: '@file **' + item.file + '**'});
        if (isDebug) console.log({file: item.file});
    }
    markdown.push({
        h3: item.name + ' <span style="text-transform: uppercase; font-size: small; color: darkgray"> ' + item.type + '</span>'
    });
    // markdown.push({p: '<span style="text-transform: uppercase; font-size: small"> ' + item.type + '</span> ' });
    markdown.push({p: item.summary });
    markdown.push({
        "code": {
            language: "php"
            , content: [item.signature]
        }
    })
    if (item.desc) {
        markdown.push({
            h4: 'Description'
        });
        markdown.push({p: item.desc});
    }
    markdown.push({
        h4: 'Parameters'
    });
    const params = [];
    item.params.forEach((param) => {
        params.push(
            '**' + param.name + '** <span style="color:crimson"> ' + param.type + '</span> '
            + param.description
        )
    })
    markdown.push({ ul: params});
    markdown.push({detailsOpen: ''});
    markdown.push({
        "code": {
            language: "php"
            , content: [item.raw + item.signature]
        }
    })
    markdown.push({detailsClose: ''});
});

// Done
if (isDebug) console.log(json2md(markdown));
fs.writeFileSync(config.dest, json2md(markdown), 'utf8');

/**
 * Add an action or filter to the data constant.
 */
function addItem(file, itemData) {

    let item = {};
    item.file = file; // .replace( 'src/', '' );

    let type = getType(itemData);

    if (type && itemData.tags) {

        item.name = getName(type, itemData.code);
        item.type = type;

        let info = getInfo(itemData);

        item.summary = info.summary;

        item.desc = info.desc;

        item.since = getSince(itemData);

        let trimmedLines = '';
        itemData.raw.split(/\r?\n/).forEach(function (elm, ind, arr) {
            const prefix = ind > 0 ? ' ' : '';
            let content = elm.trim();
            if (content === '*/') {
                //  TODO:
                //   Why itemData.pos is not the line number?
                // Add a file tag
                content = '*\n * @file ' + item.file.slice(3) + '\n ' + content;
            }
            trimmedLines += prefix + content + "\n";
        })
        item.raw = trimmedLines;

        item.params = getParams(item, itemData);
        item.signature = getSignature(item, itemData);


        /*
         * Check for validity and add hook. A hook must have
         * at least a name and a summary.
         */
        if (item.name) { // && item.summary
            return item;
        }
    }
    return null;
}

function getSignature(item, itemData) {
    let signature = ''
    switch (item.type) {
        case 'action':
            signature = 'do_action(\'' + item.name + '\',';
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
function getType(itemData) {

    let type = '';

    if (itemData.code) {

        let code = itemData.code;

        code = code.split('\n');

        code = code[0];

        if (code) {

            if (code.startsWith('do_action')) {
                type = 'action';
            } else if (code.includes('apply_filters')) {
                type = 'filter';
            }
        }
    }

    return type;

}

/**
 * Format a hook name.
 */
function getName(type, code) {

    let name = '';

    let start = 'filter' === type ? 'apply_filters(' : 'do_action(';

    code = code.replace(/\n/g, '');

    code = code.replace(/\s+/g, '');

    code = code.replace(/['"]+/g, '');

    code = code.replace(/\)/g, ',)');

    name = code.substring(
        code.indexOf(start) + start.length,
        code.indexOf(',')
    );

    if (name.includes('.')) {

        name = name.split('.');

        if (3 == name.length) {
            name = name[0] + '{' + name[1] + '}' + name[2];
        } else if (2 == name.length) {
            name = name[0] + '{' + name[1] + '}';
        }
    }

    if (!name.startsWith(namespace)) {
        return false;
    }

    return name;

}

/**
 * Parse out the summary and description from the
 * raw data of the docBlock and return it in an
 * info object.
 */
function getInfo(itemData) {

    let info = {
        summary: '',
        desc: ''
    };

    /*
     * The goal is to get the summary and description to be
     * an array of paragraphs in rawData.
     */
    let rawData = itemData.raw;

    rawData = rawData.replace(/\t|\n/g, ''); // Remove all the tabs and all line
                                             // breaks; then we can rely on just
                                             // where the asterix are.
    rawData = rawData.replace(/\s\s+/g, ' '); // Clean up white-spaces.
    rawData = rawData.replace('/** * ', ''); // Remove the docBlock's starting
                                             // code.
    rawData = rawData.replace(/ \* /g, ' '); // Single line breaks should be
                                             // treated as just normal spaces.
    rawData = rawData.split(' * ');

    let deleteStart = 0;
    for (let i = 0; i < rawData.length; i++) {
        if (rawData[i].charAt(0) == '@') {
            deleteStart = i;
            break;
        }
    }

    rawData.splice(deleteStart);

    if (rawData[0]) {
        info.desc = rawData.splice(1).join('\n\n');
        info.summary = rawData[0];
    }
    return info;
}

/**
 * Format a hook's since version number.
 */
function getSince(itemData) {
    let since = '';
    if (itemData.tags.since) {
        since = itemData.tags.since.replace('Theme_Blvd', 'Theme Blvd Framework');
        since = since.replace('Jump_Start', 'Jump Start');
    }
    return since;
}

/**
 * Format hook parameters.
 *
 * Reimplemented by parsing source.
 *
 * @TODO A current problem is that array descriptions and
 * inner items do not get parsed. We may need to adjust
 * how our docblock array values are formatted, which will
 * stray from WordPress.
 */
function getParams(item) {
    let params = [];
    let count = 1;

    // Find @param lines
    item.raw.split('\n').forEach((line, ind) => {
        if (line.indexOf('@param') > -1) {

            let output = {
                name: '',
                type: '',
                description: ''
            };

            // Evaluate raw line
            // @see https://regex101.com/r/LLSG7H/2
            const regexp = /(?<type>[\\\[\]a-zA-Z0-9_]*)\s(?<name>\$[a-zA-Z0-9_]*)[\h]*(?<description>[^\n]*)/g;
            let match = regexp.exec(line);
            if (match) {
                const output = {
                    name: match.groups.name,
                    type: match.groups.type.replace('\\\\', '\\'),
                    description: match.groups.description.trim()
                };
                // if (isDebug) console.log('param ' + count + " -> ", {input: line, output});
                params.push(output)
                count++;
            } else {
                console.error({
                    error: 'Can not parse line at file',
                    line,
                    file: item.file
                });
            }
        }
    });
    return params;
}
