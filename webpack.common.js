const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        content: './src/content.ts',
        background: './src/background.ts',
        options: './src/options.ts'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'icons', to: 'icons' },
                { from: 'manifest.json', to: 'manifest.json' },
                { from: 'options.html', to: 'options.html' },
                { from: 'options.css', to: 'options.css' },
                { from: 'node_modules/html2canvas/dist/html2canvas.min.js', to: 'lib/' }
            ],
        }),
    ],
};