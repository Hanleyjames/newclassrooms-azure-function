const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
//const path = require('path');
const { v4: uuidv4 } = require('uuid');

app.http('newclassrooms', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        // Set the accept value from the header and dictionar used to store person data
        const acceptValue = request.headers.get('Accept');  
        var outputData;

        const response = await fetch("https://randomuser.me/api/?nat=us&results=100&inc=gender,name,location,dob");
        const json = await response.json();

        // If the JSON is null or empty, throw an error
        if (!json || json.length === 0) {
            throw new Error('JSON is null or empty');
        }

        var femaleOnlyDataSet = json.results.filter(person => person.gender == 'female');
        var maleOnlyDataSet = json.results.filter(person => person.gender == 'male');
        
        const populationData = {
            count: json.results.length,
            gender: getDifference(maleOnlyDataSet, femaleOnlyDataSet),
            firstName: getDifference(json.results.filter(person => isFirstCharacterBetweenAM(person.name.first)), json.results),
            lastName: getDifference(json.results.filter(person => isFirstCharacterBetweenAM(person.name.last)), json.results),
            firstNameMale: getDifference(maleOnlyDataSet.filter(person => isFirstCharacterBetweenAM(person.name.first)), maleOnlyDataSet),
            firstNameFemale: getDifference(femaleOnlyDataSet.filter(person => isFirstCharacterBetweenAM(person.name.first)), femaleOnlyDataSet),
            lastNameMale: getDifference(maleOnlyDataSet.filter(person => isFirstCharacterBetweenAM(person.name.last)), maleOnlyDataSet),
            lastNameFemale: getDifference(femaleOnlyDataSet.filter(person => isFirstCharacterBetweenAM(person.name.last)), femaleOnlyDataSet),
            states: getTopTenStates(json.results),
            femaleStates: getTopTenStateByGender(maleOnlyDataSet, femaleOnlyDataSet)[1],
            maleStates: getTopTenStateByGender(maleOnlyDataSet, femaleOnlyDataSet)[0],
            ageRanges: getAgeRanges(json.results),
            ageRangesFemale: getAgeRanges(femaleOnlyDataSet),
            ageRangesMale: getAgeRanges(maleOnlyDataSet),
        };

        const formattedData = dictFormatter(populationData);

        var blobUrl = "tst";
        switch(acceptValue){
            case 'application/json':
                try{
                    context.log(`application/json`);
                    outputData = convertArrayToJson(formattedData);
                    context.log(`converted data`);
                    const filePath = writeStringToFile(JSON.stringify(outputData), 'json', context);
                    blobUrl = await sendFileToBlobContainer(filePath, context);
                }
                catch(err){ context.log(err); }
                break;
            case 'text/plain':
                try{
                    context.log(`text/plain`);
                    outputData = convertArrayToStringWithNewLines(formattedData);
                    const filePath = writeStringToFile(outputData, 'txt', context);
                    blobUrl = await sendFileToBlobContainer(filePath, context);
                }
                catch(err){ context.log(err); }
                break;
            case 'application/xml':
                try{
                    context.log(`application/xml`);
                    outputData = '<?xml version="1.0" encoding="UTF-8"?>'+'<newclassrooms>'+OBJtoXML(convertArrayToJson(formattedData))+"</newclassrooms>";
                    const filePath = writeStringToFile(outputData, 'xml', context);
                    blobUrl = await sendFileToBlobContainer(filePath, context);
                }
                catch(err){ context.log(err); }
                
                break;
            default:
                try{
                    context.log(`application/json`);
                    outputData = convertArrayToJson(formattedData);
                    context.log(`converted data`);
                    const filePath = writeStringToFile(JSON.stringify(outputData), 'json', context);
                    blobUrl = await sendFileToBlobContainer(filePath, context);
                }
                catch(err){ context.log(err); }
                break;
        }

        return { status: 200, body: JSON.stringify({data: outputData, blobUrl: blobUrl}) };
    }
});


/**
 * Retrieves the top ten states with the most people from a JSON array.
 *
 * @param {JSON} json - The JSON array containing person objects.
 * @returns {Array} - An array of the top ten states with the most people, sorted in descending order.
 */
function getTopTenStates(json){
    //Top 10 states with the most people
    var states = {};
    json.forEach(person => {
        if(states[person.location.state] == undefined){
            states[person.location.state] = 1;
        }else{
            states[person.location.state]++;
        }
    });
    var sortable = [];
    for (var state in states) {
        sortable.push([state, states[state]]);
    }
    sortable.sort(function(a, b) {
        return b[1] - a[1];
    });
    return sortable.slice(0, 10);
}

/**
 * Calculates the percentage of people in different age ranges based on the provided JSON data.
 * @param {Array} json - The JSON data containing information about people's ages.
 * @returns {Array} - An array representing the percentage of people in the following age ranges: 0-20, 21-40, 41-60, 61-80, 81-100, 100+.
 */
function getAgeRanges(json){
    //Percentage of people in the following age ranges: 0-20, 21-40, 41-60, 61-80, 81-100, 100+
    var ageRanges = [0, 0, 0, 0, 0, 0, 0];
    for(var i = 0; i < json.length; i++){
        var age = json[i].dob.age;
        if(age <= 20){
            ageRanges[0]++;
        } else if(age <= 40){
            ageRanges[1]++;
        } else if(age <= 35){
            ageRanges[2]++;
        } else if(age <= 60){
            ageRanges[3]++;
        } else if(age <= 80){
            ageRanges[4]++;
        } else if(age <= 100) {
            ageRanges[5]++;
        } else{
            ageRanges[6]++;
        }
    }
    return ageRanges;
}



/**
 * Calculates the difference between the lengths of two JSON sets.
 * 
 * @param {JSON} jsonSetA - The first JSON set.
 * @param {JSON} jsonSetB - The second JSON set.
 * @returns {number} The percentage difference between the lengths of the two JSON sets.
 */

function getDifference(jsonSetA, jsonSetB){
    
    const countB = jsonSetB.length;
    const countA = jsonSetA.length;
    return (Math.abs(countB - countA)/((countB+countA)/2)) * 100;
}

/**
 * Retrieves the top ten states by gender.
 *
 * @param {JSON} jsonMale - The JSON object containing male data.
 * @param {JSON} jsonFemale - The JSON object containing female data.
 * @returns {Array} An array containing the top ten states for males and females.
 */
function getTopTenStateByGender(jsonMale, jsonFemale){
    var maleStates = getTopTenStates(jsonMale);
    var femaleStates = getTopTenStates(jsonFemale);
    return [maleStates, femaleStates];
}

/**
 * Checks if the first character of a string is between 'A' and 'M' (inclusive).
 * @param {string} str - The input string.
 * @returns {boolean} - True if the first character is between 'A' and 'M', false otherwise.
 */
function isFirstCharacterBetweenAM(str) {
    const firstLetter = str.charAt(0).toUpperCase();
    return firstLetter >= 'A' && firstLetter <= 'M';
}

/**
 * Formats the given dictionary data into a set of strings.
 * @param {object} dict - The dictionary containing the data.
 * @returns {string[]} - An array of formatted strings.
 */
function dictFormatter(dict){
    const genderDifference = `There is a ${dict.gender.toFixed(2)}% difference between genders in the dataset.`;
    const firstNameDifference = `Out of ${dict.count} people, ${dict.firstName.toFixed(2)}% have first names that start with a letter between A-M.`;
    const lastNameDifference = `Out of ${dict.count} people, ${dict.lastName.toFixed(2)}% have last names that start with a letter between A-M.`;
    const firstNameDifferenceMale = `Out of ${dict.count} men, ${dict.firstNameMale.toFixed(2)}% have last names that start with a letter between A-M.`;
    const lastNameDifferenceMale = `Out of ${dict.count} men, ${dict.lastNameMale.toFixed(2)}% have last names that start with a letter between A-M.`;
    const firstNameDifferenceFemale = `Out of ${dict.count} women, ${dict.firstNameFemale.toFixed(2)}% have last names that start with a letter between A-M.`;
    const lastNameDifferenceFemale = `Out of ${dict.count} women, ${dict.lastNameFemale.toFixed(2)}% have last names that start with a letter between A-M.`;
    const states = `The top 10 states with the most people are: ${dict.states.map(state => state[0]).join(', ')}`;
    const statesMale = `The top 10 states with the most men are: ${dict.maleStates.map(state => state[0]).join(', ')}`;
    const statesFemale = `The top 10 states with the most women are: ${dict.femaleStates.map(state => state[0]).join(', ')}`;
    const ageRanges = `The amount of people in the following age ranges are: 0-20: ${dict.ageRanges[0]}, 21-40: ${dict.ageRanges[1]}, `+
    `41-60: ${dict.ageRanges[2]}, 61-80: ${dict.ageRanges[3]}, 81-100: ${dict.ageRanges[4]}, 100+: ${dict.ageRanges[5]}`;
    const ageRangesMale = `The amount of men in the following age ranges are: 0-20: ${dict.ageRangesMale[0]}, 21-40: ${dict.ageRangesMale[1]},`+
    ` 41-60: ${dict.ageRangesMale[2]}, 61-80: ${dict.ageRangesMale[3]}, 81-100: ${dict.ageRangesMale[4]}, 100+: ${dict.ageRangesMale[5]}`;
    const ageRangesFemale = `The amount of women in the following age ranges are: 0-20: ${dict.ageRangesFemale[0]}, 21-40: ${dict.ageRangesFemale[1]}, `+
    `41-60: ${dict.ageRangesFemale[2]}, 61-80: ${dict.ageRangesFemale[3]}, 81-100: ${dict.ageRangesFemale[4]}, 100+: ${dict.ageRangesFemale[5]}`;
    
    return [genderDifference, firstNameDifference, lastNameDifference, firstNameDifferenceMale, lastNameDifferenceMale, firstNameDifferenceFemale, 
        lastNameDifferenceFemale, states, statesMale, statesFemale, ageRanges, ageRangesMale, ageRangesFemale];
}

/**
 * Converts an array to a JSON object with specific properties.
 * @param {Array} array - The array to be converted.
 * @returns {Object} - The JSON object with converted properties.
 */
function convertArrayToJson(array){
    return {
        "genderDifference": `${array[0]}`,
        "firstNameDifference": `${array[1]}`,
        "lastNameDifference": `${array[2]}`,
        "firstNameDifferenceMale": `${array[3]}`,
        "lastNameDifferenceMale": `${array[4]}`,
        "firstNameDifferenceFemale": `${array[5]}`,
        "lastNameDifferenceFemale": `${array[6]}`,
        "states": `${array[7]}`,
        "statesMale": `${array[8]}`,
        "statesFemale": `${array[9]}`,
        "ageRanges": `${array[10]}`,
        "ageRangesMale": `${array[11]}`,
        "ageRangesFemale": `${array[12]}`
    }
}

/**
 * Converts an array to a string with new lines.
 *
 * @param {Array} array - The array to be converted.
 * @returns {string} The string representation of the array with new lines.
 */
function convertArrayToStringWithNewLines(array){
    return array.join('\n');
}

/**
 * Converts an object to XML string representation.
 *
 * @param {Object} obj - The object to convert to XML.
 * @returns {string} The XML string representation of the object.
 */

function OBJtoXML(obj) {
    var xml = '';
    for (var prop in obj) {
      xml += obj[prop] instanceof Array ? '' : "<" + prop + ">";
      if (obj[prop] instanceof Array) {
        for (var array in obj[prop]) {
          xml += "<" + prop + ">";
          xml += OBJtoXML(new Object(obj[prop][array]));
          xml += "</" + prop + ">";
        }
      } else if (typeof obj[prop] == "object") {
        xml += OBJtoXML(new Object(obj[prop]));
      } else {
        xml += obj[prop];
      }
      xml += obj[prop] instanceof Array ? '' : "</" + prop + ">";
    }
    var xml = xml.replace(/<\/?[0-9]{1,}>/g, '');
    return xml
}



/**
 * Writes the given contents to a file with the specified file type.
 * @param {string} contents - The contents to write to the file.
 * @param {string} filetype - The file type (e.g., 'txt', 'json', 'csv').
 * @returns {string} The file path of the created file.
 */
function writeStringToFile(contents, filetype, context) {
    try{
        context.log(`Writing to file: ${contents}`);
        const filePath = `D:/local/Temp/${uuidv4()}.${filetype}`;
        context.log(`File path: ${filePath}`);
        fs.writeFileSync(filePath, contents);
        return filePath;
    }
    catch(err){
        context.log(err);
    }
}

/**
 * Uploads a file to an Azure Blob Storage container.
 * @param {string} filePath - The path of the file to be uploaded.
 * @returns {Promise<string>} The URL of the uploaded blob.
 */
async function sendFileToBlobContainer(filePath, context) {
    context.log(`Uploading file to blob storage: ${filePath}`);
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = 'newclassrooms';
    context.log(`Connection string: ${connectionString} & container name: ${containerName}`);
    try{
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
    
        //const fileName = path.basename(filePath);
        const blockBlobClient = containerClient.getBlockBlobClient(filePath);
    
        await blockBlobClient.uploadFile(filePath);
        const blobUrl = blockBlobClient.url;
        return blobUrl;
    }
    catch(err){
        context.log(err);
    }
    
}
