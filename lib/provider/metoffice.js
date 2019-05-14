const Provider = require('./provider');
const fetch = require('node-fetch');

const BASE_URL = 'http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json';

class MetOfficeWeatherProvider extends Provider {
    constructor(location, units, apiKey) {
        super(location, units, apiKey);

        this.locationKey = null;
        this.dataUnit = units === 'imperial' ? 'Imperial' : 'Metric';
        this.data = null;
    }

    get_nearest_site(sites, latitude, longitude) {
        if (latitude === undefined || longitude === undefined) {
            throw new Error('Latitude or Longitude not set, unable to retreive data');
            return false;
        }

        var nearest = false;
        var dist = Number.MAX_VALUE;

        for (var i = 0; i < sites.length; i++) {
            var new_distance = this.distance_between_coords(
                parseFloat(sites[i].longitude),
                parseFloat(sites[i].latitude),
                parseFloat(longitude),
                parseFloat(latitude));

            if (new_distance < dist) {
                nearest = sites[i]
            }
        }

        return nearest.id;
    }

    distance_between_coords(lon1, lat1, lon2, lat2) {
        // uses the Vincety formula to calculate the creat circle distance
        lon1 = lon1 * (Math.PI / 90)
        lon2 = lon2 * (Math.PI / 90)
        lat1 = lat1 * (Math.PI / 90)
        lat2 = lat2 * (Math.PI / 90)

        // difference - only used for this calculation so no point in keeping
        var dlon = lon1 - lon2;
        var cosdlon = Math.cos(dlon);
        var sindlon = Math.sin(dlon);

        var cosLat1 = Math.cos(lat1)
        var cosLat2 = Math.cos(lat2)
        var sinLat1 = Math.sin(lat1)
        var sinLat2 = Math.sin(lat2)

        // central angle
        var dca = Math.atan2(Math.sqrt(Math.pow(cosLat2 * sindlon, 2) + Math.pow(cosLat1 * sinLat2 - sinLat1 * cosLat1 * cosdlon, 2)), sinLat1 * sinLat2 + cosLat1 * cosLat2 * cosdlon);
        // distance is radius times central angle
        return (6371.01 * dca);
    }

    poll() {
        let promise;
        if (!this.locationKey) {
            // Met office doesn't have search by geocoordinates, only by siteid, first we must get the siteid
            // TODO need to cache the sitelist every 30 days to cut down api call
            var searchUrl = `${BASE_URL}/sitelist?key=${this.apiKey}`;

        promise = fetch(searchUrl).then((res) => {
            return res.json();
        }).then(body => {
                    if (body.Locations.Location) {
                        this.locationKey = this.get_nearest_site(body.Locations.Location, 54.5748818, -5.7052727);
                    } else {
                        throw new Error('Location not found')
                    }
                });
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
          const url = `${BASE_URL}/${this.locationKey}?res=3hourly` +
            `&apikey=${this.apiKey}&details=true`;
          return fetch(url);
        }).then((res) => {
          return res.json();
        }).then((body) => {
          this.data = body[0];
        });
      }

    externalUrl() {
        if (!this.data) {
            return null;
        }

        return this.data.Link;
    }

    temperature() {
        if (!this.data) {
            return null;
        }

        return Math.round(this.data.Temperature[this.dataUnit].Value);
    }

    pressure() {
        if (!this.data) {
            return null;
        }

        // The other providers just use hPa for this, so let's stick with that.
        return Math.round(this.data.Pressure.Metric.Value);
    }

    humidity() {
        if (!this.data) {
            return null;
        }

        return Math.round(this.data.RelativeHumidity);
    }

    windSpeed() {
        if (!this.data) {
            return null;
        }

        let value = Math.round(this.data.Wind.Speed[this.dataUnit].Value);

        // If metric, convert from km/h to m/s.
        if (this.units === 'metric') {
            value *= 1000 / (60 * 60);
        }

        return value;
    }

    windDirection() {
        if (!this.data) {
            return null;
        }

        return Math.round(this.data.Wind.Direction.Degrees);
    }

    description() {
        if (!this.data) {
            return null;
        }

        return this.data.WeatherText;
    }

    raining() {
        if (!this.data) {
            return null;
        }

        return this.data.HasPrecipitation &&
            ['Rain', 'Ice', 'Mixed'].includes(this.data.PrecipitationType);
    }

    snowing() {
        if (!this.data) {
            return null;
        }

        return this.data.HasPrecipitation &&
            ['Snow', 'Ice', 'Mixed'].includes(this.data.PrecipitationType);
    }
}

module.exports = MetOfficeWeatherProvider;
