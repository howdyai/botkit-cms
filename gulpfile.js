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
    concat = require('gulp-concat'),
    sass = require('gulp-sass'),
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
// Get Sassy
// -----------------------------------------------------------/
gulp.task('sass', function() {
    logData('Compiling Sass...');
    return gulp.src('./sass/*.scss')
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
// gulp.task('copy-js', function() {
//     logData('Copying JS assets...');
//     return gulp.src([])
//         .pipe(gulp.dest('./public/js/'));
// });
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
// Rebuild all the things
// -----------------------------------------------------------/
gulp.task('default', gulp.series('controller-concat', 'copy-partials','copy-more-partials', 'sass'));
