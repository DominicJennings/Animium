/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {import("url").UrlWithParsedQuery} url
 * @returns {boolean}
 */
module.exports = function (req, res, url) {
	if (req.method != "GET") return;
	var match = url.pathname.match(/\/videomaker\/full\/(\w+)\/tutorial?$/);
	if (!match) return;
	const theme = match[1];

	var redirect = `/go_full/tutorial?tray=${theme}`;
	res.setHeader("Location", redirect);
	res.statusCode = 302;
	res.end();
	return true;
};
