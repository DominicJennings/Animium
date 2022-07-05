const starter = require("./main");
const movie = require("../movie/main");
const http = require("http");

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {import("url").UrlWithParsedQuery} url
 * @returns {boolean}
 */
module.exports = function (req, res, url) {
	if (req.method != "GET" || url.pathname != "/starterList") return;
	Promise.all(movie.listStarter().map(starter.meta)).then((a) => res.end(JSON.stringify(a)));
	return true;
};