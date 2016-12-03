#!/usr/bin/env node
"use strict"

const Twitter = require('twitter');
const fs = require('fs');
const util = require('util');

// Logging
const log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
const log_stdout = process.stdout;

console.error = function(d) {
  log_file.write(util.format("%s> %s", new Date(), d) + '\n');
  log_stdout.write(util.format("%s> %s", new Date(), d) + '\n');
};

console.logWithDate = function(d) {
    log_stdout.write(util.format("\n%s> %s", new Date(), d) + '\n');
}

// Read in twitter secrets file
const twitter_secrets = JSON.parse(fs.readFileSync("twitter_secrets.json"));


// Connect to twitter
const client = new Twitter({
    consumer_key: twitter_secrets.TWITTER_CONSUMER_KEY,
    consumer_secret: twitter_secrets.TWITTER_CONSUMER_SECRET,
    access_token_key: twitter_secrets.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: twitter_secrets.TWITTER_ACCESS_TOKEN_SECRET
});

const stream = client.stream('statuses/filter', {follow: 87818409});
stream.on('data', function(event) {
    console.logWithDate("Guardian-related tweet: " + event.text)
    if (event.user.id === 87818409) {
        client.post(
            'statuses/update',
            {status: misspellRandomWords(event.text)},
            function(error, tweet, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.logWithDate("Bot tweet: " + tweet.text);  // Tweet body.
                    console.log(response);  // Raw response object.
                }
            }
        );
    }
});

stream.on('error', function(error) {
    console.error(error)
});


/* Helper functions */

function swapRandomLetters(word) {
    const limit = word.length;
    const iFirstLetter = Math.floor(Math.random() * limit);
    var iSecondLetter = Math.floor(Math.random() * limit);

    while (iFirstLetter === iSecondLetter) {
        iSecondLetter = Math.floor(Math.random() * limit);
    }

    let letters = word.split("");
    letters[iFirstLetter] = word[iSecondLetter];
    letters[iSecondLetter] = word[iFirstLetter];
    return letters.join("");
}

function isLink(word) {
    // Very crude URL check
    return word.substring(0,4) === "http";
}

function misspellRandomWords(sentence) {
    let words = sentence.split(" ");
    const limit = words.length;

    // Choose a first word, filtering out urls
    var iFirstWord = Math.floor(Math.random() * limit);
    while (isLink(words[iFirstWord]) || words[iFirstWord][0] === "@" ) {
        iFirstWord = Math.floor(Math.random() * limit);
    }

    // Choose second misspelled word, and make sure it isn't the first or an URL
    var iSecondWord = Math.floor(Math.random() * limit);
    while (isLink(words[iSecondWord]) ||
            iSecondWord === iFirstWord ||
            words[iSecondWord][0] === "@") {
        iSecondWord = Math.floor(Math.random() * limit);
    }

    words[iFirstWord] = swapRandomLetters(words[iFirstWord]);
    words[iSecondWord] = swapRandomLetters(words[iSecondWord]);

    return words.join(" ");
}