#!/usr/bin/env node
"use strict";

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
};

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
        console.logWithDate("Guardian tweet: " + event.text);
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
        console.logWithDate("Guardian-related tweet: " + event.text);
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
  console.logWithDate('connecting');
});

stream.on('reconnect', function (reconn, res, interval) {
  console.logWithDate('reconnecting. statusCode:', res.statusCode);
});


/* Helper functions */

function swapRandomLetters(word) {
    const limit = word.length;
    const iFirstLetter = Math.floor(Math.random() * limit);
    var iSecondLetter = Math.floor(Math.random() * limit);

    if (word.length <= 1) {
        return word;
    }

    let nLoops = 0; // To detect and log infinite loops
    while (iFirstLetter === iSecondLetter) {
        iSecondLetter = Math.floor(Math.random() * limit);

        // Infinite loop detection
        if (++nLoops > 1000) {
            console.error("Infinite loop detected on word: " + word);
        }
    }

    let letters = word.split("");
    letters[iFirstLetter] = word[iSecondLetter];
    letters[iSecondLetter] = word[iFirstLetter];
    return letters.join("");
}

// Very crude URL check
const isLink = word => word.substring(0,4) === "http";

const isMention = word => word[0] === "@";

const numberOfDistinctLetters = word => Array.from(new Set(word)).length;

/* Determines if a word is 'swappable'. Swappable words are words which are not
 * URLs or @mentions, are not empty strings, and have more than one distinct
 * letter, and therefore are suitable for having their spelling changed by
 * swapping random letters (carried out by a different function)
 */
const isSwappable = word =>
    !isLink(word) &&
    !isMention(word) &&
    numberOfDistinctLetters(word) > 1 &&
    word.length > 0;

function countSwappableWords(wordList) {
    return wordList.filter(isSwappable).length;
}

/* Chooses two random words from the text of a tweet and produces a new tweet
 * with two random words misspelled. Avoids misspelling links or mentions.
 */
function misspellRandomWords(sentence) {
    var iFirstWord;
    var iSecondWord;
    let words = sentence.split(" ");
    const limit = words.length;

    // Count the number of swappable words
    const numberSwappable = countSwappableWords(words);

    // If there aren't any swappable words, return the sentence unchanged.
    if (numberSwappable === 0) {
        return sentence;
    }

    // If there is at least one swappable word, choose a random swappable word
    // and swap two of its letters so it is misspelled.
    if (numberSwappable > 0) {
        // Choose a word
        iFirstWord = Math.floor(Math.random() * limit);

        // Keep choosing words until we choose a swappable one

        let nLoops = 0; // Infinite loop error detection
        while (!isSwappable(words[iFirstWord])) {
            iFirstWord = Math.floor(Math.random() * limit);

            // Infinite loop detection
            if (++nLoops > 1000) {
                console.error("Infinite loop detected on sentence: " + sentence);
            }

        }

        // Replace the chosen word with a misspelled version
        words[iFirstWord] = swapRandomLetters(words[iFirstWord]);
    }

    // If there are at least two swappable words, choose a second and
    // scramble its spelling as well.
    if (numberSwappable > 1) {
        // Choose second swappable word to misspell, and make sure it isn't the
        // first or a URL.
        iSecondWord = Math.floor(Math.random() * limit);

        // Keep choosing words until a swappable one is chosen

        let nLoops = 0; // infinite loop error detection
        while (!isSwappable(words[iSecondWord])) {
            iSecondWord = Math.floor(Math.random() * limit);

            // Infinite loop detection
            if (++nLoops > 1000) {
                console.error("Infinite loop detected on sentence: " + sentence);
            }

        }

        // Misspell the second word
        words[iSecondWord] = swapRandomLetters(words[iSecondWord]);
    }

    return words.join(" ");
}