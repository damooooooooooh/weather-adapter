const Provider = require('./provider');
const fetch = require('node-fetch');

const BASE_URL = 'http://datapoint.metoffice.gov.uk/public/data/val/wxobs/all/json';

//#region "metoffice"
const dictMetOfficeWeatherCodes = {
    '0': 'Clear night',
    '1': 'Sunny day',
    '2': 'Partly cloudy (night)',
    '3': 'Partly cloudy (day)',
    '4': 'Not used',
    '5': 'Mist',
    '6': 'Fog',
    '7': 'Cloudy',
    '8': 'Overcast',
    '9': 'Light rain shower (night)',
    '10': 'Light rain shower (day)',
    '11': 'Drizzle',
    '12': 'Light rain',
    '13': 'Heavy rain shower (night)',
    '14': 'Heavy rain shower (day)',
    '15': 'Heavy rain',
    '16': 'Sleet shower (night)',
    '17': 'Sleet shower (day)',
    '18': 'Sleet',
    '19': 'Hail shower (night)',
    '20': 'Hail shower (day)',
    '21': 'Hail',
    '22': 'Light snow shower (night)',
    '23': 'Light snow shower (day)',
    '24': 'Light snow',
    '25': 'Heavy snow shower (night)',
    '26': 'Heavy snow shower (day)',
    '27': 'Heavy snow',
    '28': 'Thunder shower (night)',
    '29': 'Thunder shower (day)',
    '30': 'Thunder'
}

const arrMetRainingWeatherCodes = ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '28', '29']
const arrMetSnowingWeatherCodes = ['19', '20', '21', '22', '23', '24', '25', '26', '27']

const dictMetOfficeRegionIds = {
    'os': 'Orkney & Shetland',
    'he': 'Highland & Eilean Siar',
    'gr': 'Grampian',
    'ta': 'Tayside',
    'st': 'Strathclyde',
    'dg': 'Dumfries, Galloway, Lothian',
    'ni': 'Northern Ireland',
    'yh': 'Yorkshire & the Humber',
    'ne': 'Northeast England',
    'em': 'East Midlands',
    'ee': 'East of England',
    'se': 'London & Southeast England',
    'nw': 'Northwest England',
    'wm': 'West Midlands',
    'sw': 'Southwest England',
    'wl': 'Wales',
    'uk': 'UK'
}

const dictMetOfficeHumanKeys = {
    'V': 'visibility',
    'W': 'weather',
    'T': 'temperature',
    'S': 'wind_speed',
    'Pp': 'precipitation',
    'P': 'pressure',
    'Pt': 'pressure_tendency',
    'H': 'humidity',
    'G': 'wind_gust',
    'F': 'feels_like_temperature',
    'D': 'wind_direction',
    'Dp': 'dew_point',
    'U': 'uv',
  '$': 'name'
}

const dictMetOfficeCompassAzimuth = {
    'N': 0,
    'NNE': 22.5,
    'NE': 45,
    'ENE': 67.5,
    'E': 90,
    'ESE': 112.5,
    'SE': 135,
    'SSE': 157.5,
    'SSW': 202.5,
    'SW': 225,
    'WSW': 247.5,
    'W': 270,
    'WNW': 292.5,
    'NW': 315,
    'NNW': 337.5
}

//#endregion

class MetOfficeWeatherProvider extends Provider {
    constructor(location, units, apiKey) {
        super(location, units, apiKey);

        this.locationKey = null;
        this.dataUnit = units === 'imperial' ? 'Imperial' : 'Metric';
        this.data = null;
    }

    //#region "Met Office specific functions"
    get_nearest_site(sites, latitude, longitude) {
        if (latitude === undefined || longitude === undefined) {
            throw new Error('Latitude or Longitude not set, unable to retreive data');
            return false;
        }

        var nearest = false;
        var distance = false;

        for (var i = 0; i < sites.length; i++) {
            var new_distance = this.distance_between_coords(
                parseFloat(sites[i].longitude),
                parseFloat(sites[i].latitude),
                parseFloat(longitude),
                parseFloat(latitude));

            if (distance == false || new_distance < distance) {
                distance = new_distance;
                nearest = sites[i];
            }
        }

        return nearest.id;
    }

    distance_between_coords(lon1, lat1, lon2, lat2) {
        var distance = Math.abs(lon1 - lon2) + Math.abs(lat1 - lat2);
        return distance;
    }
    //#endregion

    poll() {
        let promise;
        if (!this.locationKey) {
            var searchUrl = `${BASE_URL}/sitelist?key=${this.apiKey}`;

            promise = fetch(searchUrl).then((res) => {
                return res.json();
            }).then(body => {
                if (body.Locations.Location) {
                    //this.locationKey = this.get_nearest_site(body.Locations.Location, this.location.latitude, this.location.longitude);
                    this.locationKey = this.get_nearest_site(body.Locations.Location, 35.6212977, -118.4155428)
                } else {
                    throw new Error('Location not found')
                }
            });
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            const url = `${BASE_URL}/${this.locationKey}?` +
                `apikey=${this.apiKey}&res=hourly`;
            return fetch(url);
        }).then((res) => {
            return res.json();
        }).then((body) => {
            this.data = body.SiteRep.DV.Location.Period[body.SiteRep.DV.Location.Period.length - 1]
                        .Rep[body.SiteRep.DV.Location.Period[body.SiteRep.DV.Location.Period.length - 1].Rep.length - 1];
        });
    }

    externalUrl() {
        // Met Office doesn't supply a link to the Observation
        return 'https://www.metoffice.gov.uk/';
    }

    temperature() {
        //Always in celcius so need to handle the units
        if (!this.data) {
            return null;
        }

        let value = Math.round(this.data['T']);
        if (this.units === 'metric') {
            value = (value * 1.8) + 32;
        }
        return value;
    }

    pressure() {
        if (!this.data) {
            return null;
        }

        // The other providers just use hPa for this, so let's stick with that.
        return Math.round(this.data['P']);
    }

    humidity() {
        if (!this.data) {
            return null;
        }

        return Math.round(this.data['H']);
    }

    windSpeed() {
        if (!this.data) {
            return null;
        }

        let value = Math.round(this.data['S']);

        // If metric, convert from km/h to m/s.
        if (this.units === 'metric') {
            value = value * 1.609;
        }

        return value;
    }

    windDirection() {
        //TODO Need to convert the Compass value to degrees
        if (!this.data) {
            return null;
        }

        return dictMetOfficeCompassAzimuth[this.data['D']];
    }

    description() {
        if (!this.data) {
            return null;
        }

        return dictMetOfficeWeatherCodes[this.data['W']];
    }

    raining() {
        if (!this.data) {
            return null;
        }

        return arrMetRainingWeatherCodes.includes(this.data['W']);
    }

    snowing() {
        if (!this.data) {
            return null;
        }

        return arrMetSnowingWeatherCodes.includes(this.data['W']);
    }

}

module.exports = MetOfficeWeatherProvider;
