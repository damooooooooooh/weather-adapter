var metoffice = require('./metoffice');
var acc = require('./accuweather')

forecaster = new metoffice(null, 'imperial', '1ca1285f-b492-4237-8a90-7d1bf6f3d65b');
let promise;
promise = forecaster.poll();
promise.then(() => {printValues();});

function printValues() {
  console.log(forecaster.temperature());
  console.log(forecaster.pressure());
  console.log(forecaster.humidity());
  console.log(forecaster.windSpeed());
  console.log(forecaster.windDirection());
  console.log(forecaster.description());
  console.log(forecaster.raining());
  console.log(forecaster.snowing());
}