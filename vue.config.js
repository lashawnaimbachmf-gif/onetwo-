const fs = require('fs')
const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

// HBuilderX 内置的 copy-webpack-plugin 是 5.x，构造参数必须是“数组”，
// 而不是 6.x 的 { patterns: [...] }，否则会报 CopyPlugin Invalid Options: options should be array
const cloudfunctionsDir = path.resolve(__dirname, 'cloudfunctions')
const outputDir = process.env.UNI_OUTPUT_DIR || path.resolve(__dirname, 'unpackage/dist/dev/mp-weixin')

const copyPatterns = fs.existsSync(cloudfunctionsDir)
  ? [{
      from: cloudfunctionsDir,
      to: path.join(outputDir, 'cloudfunctions'),
      ignore: ['**/node_modules/**']
    }]
  : []

module.exports = {
  configureWebpack: {
    devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
    plugins: copyPatterns.length ? [new CopyWebpackPlugin(copyPatterns)] : []
  },
  productionSourceMap: false
}
