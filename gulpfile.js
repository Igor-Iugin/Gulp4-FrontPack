
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
const babel        = require('gulp-babel')
const concat       = require('gulp-concat')
const uglify       = require('gulp-uglify')

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
  src('source/scripts/vendor.js')
    .pipe(babel({ presets: ['@babel/preset-env'] }))
    .pipe(concat('vendor.js'))
    .pipe(uglify())
    .pipe(dest('build/scripts'))
  src('source/scripts/global.js')
    .pipe(babel({ presets: ['@babel/preset-env'] }))
    .pipe(concat('global.js'))
    .pipe(uglify())
    .pipe(dest('build/scripts'))
  return src('source/scripts/components/**/*.js')
		.pipe(babel({ presets: ['@babel/preset-env'] }))
    .pipe(uglify())
    .pipe(dest('build/scripts/components'))
}

//* Move files
function moveFiles() {
	return src([
		'source/css/*.css',
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
exports.build   = series(clean, moveFiles, html, parallel(stylesMinify, scripts, htmlMinify))
exports.default = series(styles, parallel(browserSync, watcher))
