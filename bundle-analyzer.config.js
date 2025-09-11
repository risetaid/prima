const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const path = require('path')

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: path.resolve(__dirname, 'bundle-report.html'),
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: path.resolve(__dirname, 'bundle-stats.json'),
      logLevel: 'info'
    })
  ]
}