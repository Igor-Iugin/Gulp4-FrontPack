
/* Other */
const { src, dest, parallel, series, watch } = require('gulp')
const server       = require('browser-sync').create()
const bssi         = require('browsersync-ssi')
const ssi          = require('ssi')
const plumber 		 = require('gulp-plumber')
const del          = require('del')
const sourcemaps   = require('gulp-sourcemaps')

/* HTML */
const htmlmin      = require('gulp-htmlmin')

/* JS */
const webpack      = require('webpack-stream')

/* CSS */
const sass         = require('gulp-sass')
const postcss      = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const cssnano      = require('cssnano')

/* Sprite */
const svgSprite    = require('gulp-svg-sprite')

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
	watch(['source/scripts/**/*.js', '!source/scripts/*.min.js', '!source/scripts/_*.js'], { usePolling: true }, scripts)
	watch(`source/**/*.{${fileswatch}}`, { usePolling: true }).on('change', server.reload)
}


//# === Development ===

//* Scripts
function scripts() {
	return src(['source/scripts/*.js', '!source/scripts/_*.js'])
		.pipe(webpack({
			mode: 'production',
			watch: true,
			performance: { hints: false },
			module: {
				rules: [
					{
						test: /\.(js)$/,
						exclude: /(node_modules)/,
						loader: 'babel-loader',
						query: {
							presets: ['@babel/env'],
							plugins: ['babel-plugin-root-import']
						}
					}
				]
			}
		})).on('error', function handleError() {
			this.emit('end')
		})
		.pipe(dest('build/scripts'))
}

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

//* SVG Sprite
//! Доработать
function sprite() {
	return src('source/images/icons/*.svg')
		.pipe(plumber())
		.pipe(svgSprite({
			mode: {
				symbol: true
			},
			shape: {
				transform: [{
					svgo: {
						plugins: [{
							removeAttrs: {
							attrs: ['fill', 'stroke', 'width', 'height']
							}
						}]
					}
				}]
			}
		}))
		.pipe(dest('source/images'))
}


//# === Production ===

//* HTML
async function html() {
	let includes = new ssi('source/', 'build/', '/**/*.html')
	includes.compile()
	del('build/templates', { force: true })
}

//* Move files
function moveFiles() {
	return src([
		'{source/scripts,source/css}/*.{min.js,css}',
		'source/images/**/*.*',
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

//* Styles minify
function stylesMinify() {
	return src(['source/styles/*.css'])
		.pipe(postcss([ cssnano({ preset: ['default', {discardComments: { removeAll: true }}]})]))
		.pipe(dest('prod/styles'))
}

//* HTML minify
function htmlMinify() {
	return src('prod/*.html')
		.pipe(htmlmin({
			collapseWhitespace: false,
			removeComments: true
		}))
		.pipe(dest('prod'))
}


exports.styles  = styles
exports.scripts = scripts
exports.images  = images
exports.sprite  = sprite
exports.clean   = clean
exports.minify  = parallel(stylesMinify, scripts, htmlMinify)
exports.build   = series(clean, moveFiles, html, parallel(stylesMinify, scripts, htmlMinify))
exports.default = series(styles, parallel(browserSync, watcher))
