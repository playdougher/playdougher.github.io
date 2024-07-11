// module.exports = config => {
// };

// Don’t forget to `npm install @iarna/toml`
// const toml = require("@iarna/toml");

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
    
    return {
        markdownTemplateEngine: 'njk',
        dataTemplateEngine: 'njk',
        htmlTemplateEngine: 'njk',
        dir: {
            input: 'src',
            output: 'dist'
        }
    };
    
};
