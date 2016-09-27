var gulp = require('gulp-help')(require('gulp'));
var eslint = require('gulp-eslint');
var mocha = require('gulp-mocha');
var jsdoc = require('gulp-jsdoc3');
var sequence = require('run-sequence');
var babel = require('gulp-babel');
var babelRegister = require('babel-core/register');
var spawn = require('child_process').spawn;
var path = require('path');
var gutil = require("gulp-util");
var webpack = require('webpack');
var webpack_conf = require('./webpack.config');
var sourcemaps = require('gulp-sourcemaps');

var GULP_FILE = ['gulpfile.js'];
var SRC_FILES = ['src/**/*.js'];
var TEST_FILES = ['test/**/*.js'];
var TEST_CASE_FILES = ['test/**/*.spec.js'];
var COMPILED_SRC_DIR = 'build/source';
var JSDOC_DIR = 'build/jsdoc';
var WWW_JS = 'www/app/**/*.js';

////
//// Server-side tasks

gulp.task('lint', 'Validates code with "eslint"', function (done) {
  gulp.src(GULP_FILE.concat(SRC_FILES, TEST_FILES))
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .on('finish', done);
});

gulp.task('test', 'Run tests without code coverage', function () {
  return gulp.src(TEST_CASE_FILES)
    .pipe(mocha({ compilers: { js: babelRegister } }));
});

gulp.task('coverage', 'Runs tests and generates code coverage report', function (done) {
  console.log('running code coverage...');

  let file = 'nyc';
  if (process.platform === 'win32') file = 'nyc.cmd';

  let execute = () => {
    return spawn(path.join(__dirname, 'node_modules/.bin/', file), ['node_modules/.bin/mocha'], { stdio: "inherit", cwd: __dirname });
  }

  execute().on('close', (code) => {
    if (code === 1) {
      //run again just in case
      execute().on('close', done);
    } else {
      done(code);
    }
  });
});

gulp.task('compile', 'Compiles source code from es6 to es5', function (done) {
  gulp.src(SRC_FILES)
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('.', { includeContent: false, sourceRoot: '../../src' }))
    .pipe(gulp.dest(COMPILED_SRC_DIR))
    .on('finish', done);
});

gulp.task('jsdoc', 'Generates jsdoc', ['compile'], function (done) {
  gulp.src(SRC_FILES, { read: false })
    .pipe(jsdoc({
      opts: { destination: JSDOC_DIR }
    }, done));
});

gulp.task('build', 'Builds source code: validates it and provides an artifacts', function (done) {
  sequence('lint', 'coverage', 'compile', 'jsdoc', done);
});

////
//// client-side tasks

gulp.task('www-lint', 'Validates clientside code with "eslint"', function (done) {
  gulp.src(WWW_JS)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .on('finish', done);
});

gulp.task('webpack', 'bundles the clientside js files', ['www-lint'], function (done) {
  webpack(webpack_conf, function (err, stats) {
    if (err) throw new gutil.PluginError("webpack", err);
    gutil.log("[webpack]", stats.toString({
      // output options
    }));
    done();
  });
});

gulp.task('www', 'Builds clientside stuffs', ['webpack']);



/// task defaults

gulp.task('pre-commit', 'Being run automatically on a git pre-commit hook', ['build']);

gulp.task('ci', 'Being run on a CI', ['build', 'www']);

gulp.task('default', ['compile', 'www']);
