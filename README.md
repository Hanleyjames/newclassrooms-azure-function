# Newclassrooms.org

Software Engineer Trial Project

[API Endpoint](https://hanleyjames.azurewebsites.net/api/newclassrooms?)

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Testing](#testing)

## Requirements

Described below is a project that you will create in order to showcase your abilities. The input data will come from the Random User Generator (https://randomuser.me/). This service returns a list of fictional users about which you will generate statistics. Please use ?nat=us to limit the data set to fictional users from the United States. The statistics you should calculate for a given request, or set of random users, are:
1. Percentage of gender in each category
2. Percentage of first names that start with A-M versus N-Z
3. Percentage of last names that start with A-M versus N-Z
4. Percentage of people in each state, up to the top 10 most populous states
5. Percentage of females in each state, up to the top 10 most populous states
6. Percentage of males in each state, up to the top 10 most populous states
7. Percentage of people in the following age ranges: 0-20, 21-40, 41-60, 61-80, 81-100, 100+
Please expose a REST API endpoint that takes random user JSON data and a file format as input, and returns a file containing the statistics. Supported file formats for the results should include JSON, plain text, and XML. For example, the plain text file returned by your API endpoint should contain a line like, "Percentage female versus male: 66.6%". For bonus points, instead of requiring the user to specify the file format, determine it automatically from the "Accept:" header in the HTTP request.
The specific format of the data or text your API returns is up to you, as are the details of the URLs you expose. You may use any frameworks or third-party libraries that you like to complete the project. Correctness and functionality are important, but so is having a cleanly written, well organized and documented codebase with appropriate test coverage.
When delivering your project, we ask that you deploy it to a hosting environment where it is live and functional. Free services like GitHub Pages and Heroku are available, for example. Please provide the source code in the form of a Git repository—either a zip file of the repository (including the .git directory) or a hosted repository that we can clone is fine

## Installation

Use `npm run start`

## Testing

