import { codeToCountry, countryToCode } from './countryCodes.js';
import './leaflet-src.js';

async function queryApiForResponse(fetchURL) {
  const responseObj = await fetch(fetchURL, {mode: 'cors'});
  return responseObj.json();
}

async function queryOpenWeatherMap({cityName, stateCode, countryName}){
  const fetchURL = `https://api.openweathermap.org/data/2.5/weather?q=${cityName},${stateCode},${countryToCode[countryName]}&APPID=3edd8141886d125035aff03b0475978e`;
  return await queryApiForResponse(fetchURL);
}

async function queryOpenWeatherMapByCoordinates(latLong){
  const fetchURL = `https://api.openweathermap.org/data/2.5/weather?lat=${latLong.lat}&lon=${latLong.lng}&APPID=3edd8141886d125035aff03b0475978e`;
  return await queryApiForResponse(fetchURL);
}

function processOpenWeatherMapResponse(response) {
  const processedResponse = {
    cityName: response.name,
    countryName: codeToCountry[response.sys.country],
    latLong: response.coord,
    main: response.weather[0].main,
    description: response.weather[0].description,
    temperatureInCelsius: kelvinToCelsius(response.main.temp),
    humidityPercentage: response.main.humidity,
    visibilityInMeters: response.visibility,
    cloudPercentage: response.clouds.all,
    windSpeedInMilesPerHour: response.wind.speed,
  }
  if ('rain' in response) {
    processedResponse.rainVolumeFromLastHourInMillimeters = response.rain['1h'];
  }
  if ('snow' in response) {
    processedResponse.snowVolumeFromLastHourInMillimeters = response.snow['1h'];
  }
  return processedResponse;
}

function getInputSearchData() {
  return {
    cityName: cityNameInput.value,
    stateCode: stateCodeInput.value,
    countryName: countryNameDropdown.value,
  };
}

function kelvinToCelsius(degreesKelvin) {
  return degreesKelvin - 273.15;
}

function toOneDecimalPlace(number) {
  const numberString = '' + number;
  const indexOfDecimalPoint = numberString.indexOf('.');
  if (indexOfDecimalPoint === -1) return numberString + '.0';
  return numberString.slice(0, indexOfDecimalPoint + 2);
}

function capitalizeFirstLetter(string) {
  return string[0].toUpperCase() + string.slice(1);
}

const roundTemperature = toOneDecimalPlace;

const [
  cityNameInput, 
  stateCodeInput, 
  countryNameDropdown, 
  searchButton, 
  searchMapButton
] = [
  'city-name-input', 
  'state-code-input', 
  'country-name-dropdown', 
  'search-button', 
  'search-map-button'
]
.map((id) => document.querySelector(`#${id}`));

const [
  errorDisplay,
  resultsContainerHeader, 
  temperatureResult, 
  cloudPercentageResult, 
  humidityPercentageResult, 
  windSpeedResult, 
  visibilityResult
] = [
  '.error-display',
  '.results-container header',
  '.temperature-display .result',
  '.cloud-percentage-display .result',
  '.humidity-display .result',
  '.wind-speed-display .result',
  '.visibility-display .result',
]
.map((selector) => document.querySelector(selector));

function displayErrorMessage(message) {
  errorDisplay.textContent = message;
}

function clearErrorDisplay() {
  displayErrorMessage('');
}

function displayProcessedResponse({cityName, countryName, description, temperatureInCelsius, 
  cloudPercentage, humidityPercentage, windSpeedInMilesPerHour, visibilityInMeters}) {
  console.log(!!cityName, !!countryName);
  resultsContainerHeader.textContent = `Current weather in 
    ${(cityName && countryName) ? `${cityName}, ${countryName}` : 'your selected location'}: 
    ${capitalizeFirstLetter(description)}`;
  temperatureResult.textContent = roundTemperature(temperatureInCelsius) + '˚C';
  cloudPercentageResult.textContent = cloudPercentage + '%';
  humidityPercentageResult.textContent = humidityPercentage + '%';
  windSpeedResult.textContent = windSpeedInMilesPerHour + ' miles per hour';
  visibilityResult.textContent = visibilityInMeters + ' metres';
}

searchButton.onclick = async () => {
  const inputSearchData = getInputSearchData();
  if (inputSearchData.cityName === '') {
    return displayErrorMessage('Please enter a city name.')
  }
  searchButton.classList.add('loading');
  errorDisplay.textContent = 'Loading results...';
  const response = await queryOpenWeatherMap(inputSearchData);
  searchButton.classList.remove('loading');
  if (response.cod === "404") {
    return displayErrorMessage('No city with that name found.');
  }
  const processedResponse = processOpenWeatherMapResponse(response);
  map.flyTo(processedResponse.latLong);
  moveMarker(processedResponse.latLong);
  if (inputSearchData.countryName !== processedResponse.countryName) {
    displayErrorMessage(`No city with the name ${processedResponse.cityName} found in ${inputSearchData.countryName}, but we found one in ${processedResponse.countryName}!`)
  }
  else clearErrorDisplay();
  displayProcessedResponse(processedResponse);
};

function createMarker(latLong) {
  return L.marker(latLong, {draggable: true});
}

function moveMarker(latLong) {
  currentMarker.remove();
  currentMarker = createMarker(latLong);
  currentMarker.addTo(map);
}

const startingLatLong = [51.505, -0.09];
const map = L.map('map').setView(startingLatLong, 6);

let currentMarker = createMarker(startingLatLong);
currentMarker.addTo(map);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
})
.addTo(map);

map.on('click', (e) => moveMarker(e.latlng));

searchMapButton.onclick = async () => {
  clearErrorDisplay();
  searchMapButton.classList.add('loading');
  const latLong = currentMarker.getLatLng();
  const response = await queryOpenWeatherMapByCoordinates(latLong);
  searchMapButton.classList.remove('loading');
  map.flyTo(latLong);
  const processedResponse = processOpenWeatherMapResponse(response);
  displayProcessedResponse(processedResponse);
};

for (const code in codeToCountry) {
  countryNameDropdown.innerHTML += `<option>${codeToCountry[code]}</option>`;
}