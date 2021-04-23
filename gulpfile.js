
/* Other */
const { src, dest, parallel, series, watch } = require('gulp')
const server       = require('browser-sync').create()
const bssi         = require('browsersync-ssi')
const ssi          = require('ssi')
const rename       = require('gulp-rename')
const plumber 		 = require('gulp-plumber')
const del          = require('del')

/* HTML */
const htmlmin      = require('gulp-htmlmin')

/* JS */
const webpack      = require('webpack-stream')

/* CSS */
const sass         = require('gulp-sass')
const sassglob     = require('gulp-sass-glob')
const postcss      = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const cssnano      = require('cssnano')

/* Sprite */
const svgSprite    = require('gulp-svg-sprite')

/* Images */
const imageMin     = require('gulp-imagemin')
const pngQuant 		 = require('imagemin-pngquant')


//* Server
function browserSync() {
	server.init({
		server: {
			baseDir: 'app/',
			middleware: bssi({ baseDir: 'app/', ext: '.html' })
		},
    browser: 'firefox',
		ghostMode: { clicks: false },
		notify: false,
		online: true
	})
}

//* Watch 
function spy() {
	const fileswatch   = 'html,woff2'

	watch(['app/styles/**/*', '!app/styles/*.css'], { usePolling: true }, styles)
	watch(['app/scripts/**/*.js', '!app/scripts/*.min.js', '!app/scripts/_*.js'], { usePolling: true }, scripts)
	watch(`app/**/*.{${fileswatch}}`, { usePolling: true }).on('change', server.reload)
}


//# === Development === 

//* Scripts
function scripts() {
	return src(['app/scripts/*.js', '!app/scripts/*.min.js', '!app/scripts/_*.js'])
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
		.pipe(rename({ suffix: ".min" }))
		.pipe(dest('app/scripts'))
		.pipe(server.stream())
}

//* Styles
function styles() {
	return src(['app/styles/scss/*.scss', '!app/styles/scss/**/_*.*'])
		.pipe(sassglob())
		.pipe(sass({ 
			includePaths: require('scss-resets').includePaths
		}))
    .pipe(postcss([ autoprefixer({ overrideBrowserslist: ['last 3 versions'], grid: true }) ]))
		.pipe(dest('app/styles'))
		.pipe(server.stream())
}

//* SVG Sprite
function sprite() {
	return src('app/images/**/sprite/*.svg')
		.pipe(plumber())
		.pipe(svgSprite({
			mode: {
				css: {
					bust: false,
					sprite: '../sprite.svg',
					render: {
						scss: true
					}
				},
				symbol: true
			}
		}))
		.pipe(dest('app/images'))
}


//# === Production === 

//* HTML
async function html() {
	let includes = new ssi('app/', 'prod/', '/**/*.html')
	includes.compile()
	del('prod/templates', { force: true })
}

//* Move files
function moveFiles() {
	return src([
		'{app/scripts,app/styles}/*.{min.js,css}',
		'app/images/**/*.*',
		'!app/images/**/sprite/*', /* ??? */
		'app/fonts/**/*'
	], { base: 'app/' })
	.pipe(dest('prod'))
}

//* Images
function images() {
	return src(['app/images/**/*', '!app/images/**/sprite/*'])
		.pipe(plumber())
		.pipe(imageMin({
      progressive: true,
      svgoPlugins: [
        { removeViewBox: false },
        { cleanupIDs: false },
      ],
      use: [
        pngQuant(),
      ]
    }))
		.pipe(dest('prod/images'))
}

//* Clean production folder
function clean() {
	return del('prod', { force: true })
}


//# === Minify ===

//* Styles minify
function stylesMinify() {
	return src(['app/styles/*.css'])
		.pipe(postcss([ cssnano({ preset: ['default', { discardComments: { removeAll: true } }] }) ]))
		.pipe(rename({ suffix: ".min" }))
		.pipe(dest('prod/styles'))
}

//* HTML minify (Unused)
function htmlMinify() {
	return src('prod/*.html')
		.pipe(htmlmin({
			collapseWhitespace: true,
			removeComments: true
		}))
		.pipe(rename({ suffix: ".min" }))
		.pipe(dest('prod'))
}


exports.styles  = styles
exports.scripts = scripts
exports.images  = images
exports.sprite  = sprite
exports.clean   = clean
exports.minify  = stylesMinify
exports.prod    = series(clean, moveFiles, html)
exports.default = series(scripts, styles, parallel(browserSync, spy))
