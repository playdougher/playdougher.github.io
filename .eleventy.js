// module.exports = config => {
// };

// Don’t forget to `npm install @iarna/toml`
// const toml = require("@iarna/toml");
const markdownit = require("markdown-it");
const pluginTOC = require('eleventy-plugin-toc');
const anchor = require("markdown-it-anchor");
module.exports = function (eleventyConfig) {
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
        flat: false,
        wrapperLabel: 'asf'
    })
    eleventyConfig.setLibrary("md", markdownit().use(anchor));
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
