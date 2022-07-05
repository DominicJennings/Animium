
var caché = {};
module.exports = {
	getKey(req) {
		return req.headers['x-forwarded-for'];
	},
	/**
	 * 
	 * @param {sessionType} data 
	 */
	set(data, req) {
		const ip = this.getKey(req);
		caché[ip] = caché[ip] || {};
		Object.assign(caché[ip], data);
	},
	get(req) {
		const ip = this.getKey(req);
		return caché[ip];
	},
	remove(req) {
		const ip = this.getKey(req);
		delete caché[ip];
	},
}