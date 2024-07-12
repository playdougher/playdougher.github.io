// module.exports = config => {
// };

// Don’t forget to `npm install @iarna/toml`
// const toml = require("@iarna/toml");
const markdownit = require("markdown-it");
const pluginTOC = require('eleventy-plugin-toc');
const anchor = require("markdown-it-anchor");
const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
module.exports = function (eleventyConfig) {
    // Copy the `themes` directory to the output
    eleventyConfig.addPassthroughCopy('themes');
    // Watch the `themes` directory for changes
    eleventyConfig.addWatchTarget('themes');
    // Set directories to pass through to the dist folder

    // Copy the `css` directory to the output
    eleventyConfig.addPassthroughCopy('css');
    // Watch the `css` directory for changes
    eleventyConfig.addWatchTarget('css');
    
    // Set directories to pass through to the dist folder
    eleventyConfig.addPassthroughCopy('./src/images/');
    
    // eleventyConfig.setFrontMatterParsingOptions({
    //     engines: {
    //         toml: toml.parse.bind(toml),
    //     },
    // });
    eleventyConfig.addPlugin(pluginTOC, {
        tags: ['h2', 'h3', 'h4'],
        wrapper: 'nav',
        wrapperClass: 'toc',        
        ul: true,
        flat: false,
    })
    eleventyConfig.setLibrary("md", markdownit().use(anchor));
    eleventyConfig.addPlugin(eleventyNavigationPlugin);
    eleventyConfig.addPlugin(syntaxHighlight);    
    return {
        markdownTemplateEngine: 'njk',
        dataTemplateEngine: 'njk',
        htmlTemplateEngine: 'njk',
        dir: {
            input: 'src',
            output: '_site'
        }
    };
};
