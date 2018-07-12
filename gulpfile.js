// -----------------------------------------------------------/
// gulpfile.js
// HowdyPro web site
// howdy.ai
// Change Log:
//  ** Repaired the gulp watch to reload on changes to js and sass files.
//  ** Added livereload plugin to refresh the page in the browser (note: livereload extension needs to be enabled in chrome)
//  ** Added gulp task to run unit tests and unit test coverate report per mocha unit test support
// -----------------------------------------------------------/
// -----------------------------------------------------------/
// Dependencies
// -----------------------------------------------------------/
var gulp = require('gulp'),
    prefix = require('gulp-autoprefixer'),
    insert = require('gulp-insert'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    jshint = require('gulp-jshint'),
    handlebars = require('gulp-compile-handlebars'),
    fs = require('fs'),
    sass = require('gulp-sass'),
    nodemon = require('gulp-nodemon'),
    notify = require('gulp-notify'),
    livereload = require('gulp-livereload'),
    mocha = require('gulp-mocha'),
    coverage = require('gulp-coverage'),
    gutil = require('gulp-util'),
    package = require('./package.json');

var banner = function() {
    return '/*! ' + package.name + ' - v' + package.version + ' - ' + gutil.date(new Date(), "yyyy-mm-dd") +
        ' [copyright: ' + package.copyright + ']' + ' */';
};

function logData() {
    gutil.log(
        gutil.colors.bgGreen(
            gutil.colors.white(
                gutil.colors.bold(
                    gutil.colors.white.apply(this, arguments)
                )
            )
        )
    );
}

function ready() {
    gutil.log(
        gutil.colors.bgMagenta(
            gutil.colors.white(
                gutil.colors.bold('[          STATUS: READY          ]')
            )
        )
    );
}

// -----------------------------------------------------------/
// Get Linty
// -----------------------------------------------------------/
gulp.task('lint', function() {
    logData('Running lint...');
    return gulp.src(['./js/*.js'])
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'));
});
// -----------------------------------------------------------/
// Get Sassy
// -----------------------------------------------------------/
gulp.task('sass', function() {
    logData('Compiling Sass...');
    gulp.src('./sass/*.scss')
        .pipe(sass({
            outputStyle: 'compressed'
        }).on('error', sass.logError))
        .pipe(gulp.dest('./public/css/'));
});
// -----------------------------------------------------------/
// Get JSesesussy
// Copy JS files to public scripts distribution folder
// -----------------------------------------------------------/
// copy JS scripts
gulp.task('copy-js', function() {
    logData('Copying JS assets...');
    return gulp.src([])
        .pipe(gulp.dest('./public/js/'));
});
// copy partials to public scripts
gulp.task('copy-partials', function() {
    logData('Copying HTML partials...');
    return gulp.src(['./botkit-scriptui/*.html'])
        .pipe(gulp.dest('./public/js/partials/'));
});

// copy partials to public scripts
gulp.task('copy-more-partials', function() {
    logData('Copying HTML partials...');
    return gulp.src(['./views/partials/*.html'])
        .pipe(gulp.dest('./public/partials/'));
});

// concat controllers to public scripts
gulp.task('controller-concat', function() {
    logData('Concatenating and Copying Controllers...');
    return gulp.src(['./js/*.js', './botkit-scriptui/*.js'])
        .pipe(concat('scripts.js'))
        .pipe(gulp.dest('./public/js/'));
});
// -----------------------------------------------------------/
// Tests -- run gulp test or append it to the build task
// -----------------------------------------------------------/
gulp.task('test', function() {
    gulp.src('test/index.js')
        .pipe(coverage.instrument({
            pattern: ['index.js'],
            debugDirectory: 'debug'
        }))
        .pipe(mocha({
            reporter: 'spec'
        }))
        /*
        // uncomment and comment out other coverage.* pipes to get coverage HTML report
        .pipe(coverage.report({
            outFile: 'coverage.html'
        }))*/
        .pipe(coverage.gather())
        .pipe(coverage.enforce({
            statements: 85,
            lines: 85,
            blocks: 75
        }));
});
// -----------------------------------------------------------/
// Rebuild all the things
// -----------------------------------------------------------/
gulp.task('build', ['copy-js', 'controller-concat', 'copy-partials','copy-more-partials', 'sass'], ready);
// -----------------------------------------------------------/
// Default ('default') Task Handler setup:
// * Bootstrap livereload plugin to Listen for changes to javascript and css assets.
// * Bootstrap nodemon plugin to fire restart event per livereload listener changes.
// * on 'restart' event rebuild assets in the public distribution directory
// * notify (gulp-notify) sends Notification to Mac Notification Center, Linux notifications
// * livereload reloads the page in the browser.
// -----------------------------------------------------------/
gulp.task('default', function() {
    // listen for changes
    livereload.listen();
    // configure nodemon
    nodemon({
        // the script to run the app
        watch: ['./js', './sass','./botkit-scriptui'],
        verbose: true,
        env: {
            'NODE_ENV': 'development',
            'DOTBOT_CLIENTID':'howdytest',
            'DOTBOT_CLIENTSECRET':'@News4321',

        },
        script: './index.js',
        ext: 'hbs scss js',
        ignore: ['public/*', 'node_modules/*', 'bower_modules/*'],
        tasks: ['build']
    }).on('restart', function() {
        // when the app has restarted, run livereload.
        // gulp.src('./index.js')
        //     .pipe(livereload())
        //     .pipe(notify('Reloading page, please wait...'));
    });
});

gulp.task('local', function() {
    // listen for changes
    livereload.listen();
    // configure nodemon
    nodemon({
        // the script to run the app
        watch: ['./js', './sass'],
        verbose: true,
        env: {
            'NODE_ENV': 'local',
            'api_root': 'http://192.168.33.19',
            'DEBUG': 'ERROR',
            // 'MONGO_URI': 'mongodb://192.168.33.21:27017/local'
        },
        script: './index.js',
        ext: 'hbs scss js',
        ignore: ['public/*', 'node_modules/*', 'bower_modules/*'],
        tasks: ['build']
    }).on('restart', function() {
        // when the app has restarted, run livereload.
        // gulp.src('./index.js')
        //     .pipe(livereload())
        //     .pipe(notify('Reloading page, please wait...'));
    });
});

gulp.task('error', function() {
    // listen for changes
    livereload.listen();
    // configure nodemon
    nodemon({
        // the script to run the app
        watch: ['./js', './sass'],
        verbose: true,
        env: {
            'NODE_ENV': 'local',
            'api_root': 'http://192.168.33.19',
            'DOTBOT_CLIENTID':'howdytest',
            'DOTBOT_CLIENTSECRET':'@News4321',
            'DEBUG': 'ERROR',
            'throw_error': 'true'
        },
        script: './index.js',
        ext: 'hbs scss js',
        ignore: ['public/*', 'node_modules/*', 'bower_modules/*'],
        tasks: ['build']
    }).on('restart', function() {
        // when the app has restarted, run livereload.
        // gulp.src('./index.js')
        //     .pipe(livereload())
        //     .pipe(notify('Reloading page, please wait...'));
    });
});
