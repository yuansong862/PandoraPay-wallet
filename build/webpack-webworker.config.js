const webpack = require('webpack')
const base = require('./webpack.base.config')
const merge = require('webpack-merge')
const path = require('path')

module.exports = (env, argv) => merge( base(env, argv), {
    target: 'web',
    mode: 'production',

    //define entry point
    entry: {
        app: "./src/webworkers/pandorapay-webworker/pandorapay-webworker.js",
    },

    output: {
        path: path.resolve(__dirname, "./../dist/build/workers"),
        filename: "PandoraPay-webworker.js"
    },

});