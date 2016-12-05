#!/usr/bin/env node
"use strict"

const fs = require('fs');
const util = require('util');
const Twit = require('twit');

// Logging
const error_log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
const log_stdout = process.stdout;

console.error = function(d) {
  error_log_file.write(util.format("\n%s> %s", new Date(), d) + '\n');
  log_stdout.write(util.format("\n%s> %s", new Date(), d) + '\n');
};

console.logWithDate = function(d) {
    log_stdout.write(util.format("\n%s> %s", new Date(), d) + '\n');
}

// Heartbeat to make sure the process is still running
setInterval(function () {
  console.logWithDate('Program heartbeat');
}, 60*1000);


// Read in twitter secrets file
const twitter_secrets = JSON.parse(fs.readFileSync("twitter_secrets.json"));


// Connect to twitter
const client = new Twit({
    consumer_key: twitter_secrets.TWITTER_CONSUMER_KEY,
    consumer_secret: twitter_secrets.TWITTER_CONSUMER_SECRET,
    access_token: twitter_secrets.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: twitter_secrets.TWITTER_ACCESS_TOKEN_SECRET,
    timeouts_ms: 60*1000
});

// Main
const stream = client.stream('statuses/filter', {follow: 87818409});
stream.on('tweet', function(event) {
    if (event.user.id === 87818409) {
        console.logWithDate("Guardian tweet: " + event.text)
        client.post(
            'statuses/update',
            {status: misspellRandomWords(event.text)},
            function(error, tweet, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.logWithDate("Bot tweet: " + tweet.text);  // Tweet body.
                    //console.log(response);  // Raw response object.
                }
            }
        );
    } else {
        console.logWithDate("Guardian-related tweet: " + event.text)
    }
});

// Log various types of messages for debugging
stream.on('limit', function(error) {
    console.error(error);
});

stream.on('disconnect', function(error) {
    console.error(error);
});

stream.on('error', function(error) {
    console.error(error);
});

stream.on('connect', function (conn) {
  console.logWithDate('connecting')
})

stream.on('reconnect', function (reconn, res, interval) {
  console.logWithDate('reconnecting. statusCode:', res.statusCode)
})


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

// Very crude URL check
const isLink = word => word.substring(0,4) === "http";

const isMention = word => word[0] === "@";

function countSwappableWords(wordList) {
    return wordList.filter(word => !isLink(word) && !isMention(word)).length;
}


function misspellRandomWords(sentence) {
    let words = sentence.split(" ");
    const limit = words.length;

    const numberSwappable = countSwappableWords(words);
    if (numberSwappable === 0) {
        return sentence;
    }

    if (numberSwappable > 0) {
        // Choose a first word, filtering out urls
        var iFirstWord = Math.floor(Math.random() * limit);
        while (isLink(words[iFirstWord]) || isMention(words[iFirstWord])) {
            iFirstWord = Math.floor(Math.random() * limit);
        }
        words[iFirstWord] = swapRandomLetters(words[iFirstWord]);
    }

    if (numberSwappable > 1) {
        // Choose second misspelled word, and make sure it isn't the first or an URL
        var iSecondWord = Math.floor(Math.random() * limit);
        while (isLink(words[iSecondWord]) ||
                iSecondWord === iFirstWord ||
                words[iSecondWord][0] === "@") {
            iSecondWord = Math.floor(Math.random() * limit);
        }
        words[iSecondWord] = swapRandomLetters(words[iSecondWord]);
    }

    return words.join(" ");
}