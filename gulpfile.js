var gulp = require('gulp'),
    prefix = require('gulp-autoprefixer'),
    concat = require('gulp-concat'),
    sass = require('gulp-sass'),
    nodemon = require('gulp-nodemon'),
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
// Compile Sass
// -----------------------------------------------------------/
gulp.task('sass', function() {
    logData('Compiling Sass...');
    gulp.src('./sass/*.scss')
        .pipe(sass({
            outputStyle: 'compressed'
        }).on('error', sass.logError))
        .pipe(prefix({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(gulp.dest('./public/css/'));
});

// -----------------------------------------------------------/
// Copy JS files to public scripts distribution folder
// -----------------------------------------------------------/
// copy JS scripts
gulp.task('copy-js', function() {
    logData('Copying JS assets...');
    return gulp.src([])
        .pipe(gulp.dest('./public/js/'));
});

// concat controllers to public scripts
gulp.task('controller-concat', function() {
    logData('Concatenating and Copying Controllers...');
    return gulp.src(['./js/*.js'])
        .pipe(concat('scripts.js'))
        .pipe(gulp.dest('./public/js/'));
});
//
// Rebuild all the things
// -----------------------------------------------------------/
gulp.task('build', ['controller-concat','sass'], ready);
// -----------------------------------------------------------/
// Default ('default') Task Handler setup:
// * on 'restart' event rebuild assets in the public distribution directory
// * notify (gulp-notify) sends Notification to Mac Notification Center, Linux notifications
// -----------------------------------------------------------/
gulp.task('default', function() {
    // listen for changes
    // configure nodemon
    nodemon({
        // the script to run the app
        watch: ['./js', './sass','./index.js'],
        verbose: true,
        env: {
        },
        script: './index.js',
        ext: 'hbs scss js',
        ignore: ['public/*', 'node_modules/*', 'bower_modules/*'],
        tasks: ['build']
    }).on('restart', function() {
    });
});
