var metoffice = require('./metoffice');
var acc = require('./accuweather')

//acc = new acc(null, null, 'ulKQqAYSMzyW48qZB25H3n234059DCBT')
//acc.poll()

forecaster = new metoffice(null, null, '1ca1285f-b492-4237-8a90-7d1bf6f3d65b');
forecaster.poll()