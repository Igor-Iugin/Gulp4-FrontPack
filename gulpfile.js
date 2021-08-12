
/* Other */
const { src, dest, parallel, series, watch } = require('gulp')
const server       = require('browser-sync').create()
const bssi         = require('browsersync-ssi')
const ssi          = require('ssi')
const plumber 		 = require('gulp-plumber')
const del          = require('del')
const sourcemaps   = require('gulp-sourcemaps')
const rename       = require('gulp-rename')

/* HTML */
const htmlmin      = require('gulp-htmlmin')

/* JS */
const wpStream     = require('webpack-stream')

/* CSS */
const sass         = require('gulp-sass')
const postcss      = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const cssnano      = require('cssnano')

/* Sprite */
const svgStore     = require('gulp-svgstore')
const svgmin       = require('gulp-svgmin')
const cheerio      = require('gulp-cheerio')
const replace      = require('gulp-replace')

/* Images */
const squoosh      = require('gulp-squoosh')


//* Server
function browserSync() {
	server.init({
		server: {
			baseDir: 'source/',
			middleware: bssi({ baseDir: 'source/', ext: '.html' })
		},
    browser: 'firefox',
		ghostMode: { clicks: false },
		cors: true,
		notify: false,
		online: true
	})
}

//* Watch
function watcher() {
	const fileswatch   = 'html,woff2'

	watch('source/sass/**/*.scss', { usePolling: true }, styles)
	watch(['source/scripts/main.min.js', 'source/scripts/vendor.min.js']).on('change', server.reload)
	watch(`source/**/*.{${fileswatch}}`, { usePolling: true }).on('change', server.reload)
}


//# === Development ===

//* Styles
function styles() {
	return src('source/sass/style.scss')
		.pipe(sourcemaps.init())
		.pipe(sass({
			includePaths: require('scss-resets').includePaths
		}))
    .pipe(postcss([autoprefixer()]))
		.pipe(sourcemaps.write('.'))
		.pipe(dest('source/css'))
		.pipe(server.stream())
}

//* Sprite
function sprite() {
	return src('source/images/icons/*.svg')
		.pipe(svgStore({ inlineSvg: true }))
		.pipe(rename('sprite.svg'))
		.pipe(dest('source/images/icons'))
}

function svgOptim() {
	return src('source/images/icons/*.svg')
    .pipe(svgmin({
      js2svg: {
        pretty: true,
        indent: 2
      },
      plugins: [
        {
          name: 'removeViewBox',
          active: false
        }
      ]
    }))
		.pipe(cheerio({
			run: ($) => {
				$('[fill]').removeAttr('fill');
				$('[style]').removeAttr('style');
				$('[width]').removeAttr('width');
				$('[height]').removeAttr('height');
			},
			parserOptions: { xmlMode: true }
		}))
		.pipe(replace('&gt;', '>'))
		.pipe(dest('source/images/icons'))
}


//# === Production ===

//* HTML
async function html() {
	let includes = new ssi('source/', 'build/', '/**/*.html')
	includes.compile()
	del('build/templates', { force: true })
}

//* Scripts
function scripts() {
  src('source/scripts/**/*.js')
    .pipe(wpStream({
      watch: true,
      mode: 'production',
      entry: {
        'main.min': './source/scripts/app.js',
      },
      performance: {
        hints: false,
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
      },
      output: {
        filename: '[name].js'
      },
      module: {
        rules: [{
          test: /\.js$/,
          exclude: /^_(\w+)(\.js)$|node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }]
      },
      optimization: {
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: Infinity,
          minSize: 0,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendor.min"
            },
          },
        }
      },
      plugins: []
    }))
    .pipe(dest('source/scripts'))
}

//* Move files
function moveFiles() {
	return src([
		'source/css/*.css',
		'source/images/**/*.*',
		'source/scripts/bundle.min.js',
		'source/fonts/**/*'
	], { base: 'source/' })
	.pipe(dest('build'))
}

//* Images
function images() {
	return src(['source/images/**/*.{png, jpeg}', '!source/images/**/sprite.svg'])
		.pipe(plumber())
		.pipe(squoosh({
			encodeOptions: {
				webp: {}
			}
		}))
		.pipe(dest('build/images'))
}

//* Clean production folder
function clean() {
	return del('build', { force: true })
}


//# === Minify ===

//* CSS minify
function stylesMinify() {
	return src(['source/styles/*.css'])
		.pipe(postcss([ cssnano({ preset: ['default', {discardComments: { removeAll: true }}]})]))
		.pipe(dest('build/styles'))
}

//* HTML minify
function htmlMinify() {
	return src('build/*.html')
		.pipe(htmlmin({
			collapseWhitespace: true,
			removeComments: true
		}))
		.pipe(dest('build'))
}


exports.styles  = styles
exports.spriter = series(svgOptim, sprite)
exports.sprite  = sprite
exports.svgo    = svgOptim
exports.images  = images
exports.scripts = scripts
exports.clean   = clean
exports.minify  = parallel(stylesMinify, scripts, htmlMinify)
exports.build   = series(clean, moveFiles, html, parallel(stylesMinify, htmlMinify))
exports.default = series(styles, parallel(browserSync, scripts, watcher))
