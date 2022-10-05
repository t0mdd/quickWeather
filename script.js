import { codeToCountry, countryToCode } from './countryCodes.js';
import './leaflet-src.js';

async function queryApiForResponse(fetchURL) {
  const responseObj = await fetch(fetchURL, {mode: 'cors'});
  return responseObj.json();
}

async function queryOpenWeatherMap(locationData){
  const { cityName, stateCode, countryName } = locationData;
  const fetchURL = `https://api.openweathermap.org/data/2.5/weather?q=${cityName},${stateCode},${countryToCode[countryName]}&APPID=3edd8141886d125035aff03b0475978e`;
  return await queryApiForResponse(fetchURL);
}

async function queryOpenWeatherMapByCoordinates(latLong){
  const fetchURL = `https://api.openweathermap.org/data/2.5/weather?lat=${latLong.lat}&lon=${latLong.lng}&APPID=3edd8141886d125035aff03b0475978e`;
  return await queryApiForResponse(fetchURL);
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

const resultsContainer = document.querySelector('.results-container');
const [cityNameInput, stateCodeInput, countryNameDropdown, searchButton, searchMapButton] = 
  ['city-name-input', 'state-code-input', 'country-name-dropdown', 'search-button', 'search-map-button']
  .map((id) => document.querySelector(`#${id}`));

for (const code in codeToCountry) {
  countryNameDropdown.innerHTML += `<option>${codeToCountry[code]}</option>`;
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

function displayProcessedResponse(processedResponse) {
  resultsContainer.textContent = '';
  for (const key in processedResponse) {
    resultsContainer.textContent += `${key}: ${processedResponse[key]}, `;
  }
  resultsContainer.textContent = resultsContainer.textContent.slice(0,-2);
}

searchButton.onclick = async () => {
  searchButton.classList.add('loading');
  const inputSearchData = getInputSearchData();
  const response = await queryOpenWeatherMap(inputSearchData);
  searchButton.classList.remove('loading');
  if (response.cod === "404") {
    return console.log(response.message);
  }
  const processedResponse = processOpenWeatherMapResponse(response);
  map.flyTo(processedResponse.latLong);
  setMarker(processedResponse.latLong);
  if (inputSearchData.countryName !== processedResponse.countryName) {
    console.log(`No city with the name ${processedResponse.cityName} found in ${inputSearchData.countryName}, but we found one in ${processedResponse.countryName}!`)
  }
  console.log(response, processedResponse);
  displayProcessedResponse(processedResponse);
};

function createMarker(latLong) {
  return L.marker(latLong, {draggable: true});
}

function setMarker(latLong) {
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

map.on('click', (e) => setMarker(e.latlng));

function toOneDecimalPlace(number) {
  const numberString = '' + number;
  const indexOfDecimalPoint = numberString.indexOf('.');
  if (indexOfDecimalPoint === -1) return numberString + '.0';
  return numberString.slice(0, indexOfDecimalPoint + 2);
}

const roundTemperature = toOneDecimalPlace;

function capitalizeFirstLetter(string) {
  return string[0].toUpperCase() + string.slice(1);
}

searchMapButton.onclick = async () => {
  searchMapButton.classList.add('loading');
  const latLong = currentMarker.getLatLng();
  const response = await queryOpenWeatherMapByCoordinates(latLong);
  searchMapButton.classList.remove('loading');
  map.flyTo(latLong);
  const processedResponse = processOpenWeatherMapResponse(response);
  console.log(processedResponse.description);
  document.querySelector('.results-container header').textContent = `Current weather in ${processedResponse.cityName}, ${processedResponse.countryName}: ${capitalizeFirstLetter(processedResponse.description)}.`;
  document.querySelector('.temperature-display .result').textContent = roundTemperature(processedResponse.temperatureInCelsius) + '˚C';
  document.querySelector('.cloud-percentage-display .result').textContent = processedResponse.cloudPercentage + '%';
  document.querySelector('.humidity-display .result').textContent = processedResponse.humidityPercentage + '%';
  document.querySelector('.wind-speed-display .result').textContent = processedResponse.windSpeedInMilesPerHour + ' miles per hour';
  document.querySelector('.visibility-display .result').textContent = processedResponse.visibilityInMeters + ' metres';
};
