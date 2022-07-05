const loadPost = require("../misc/post_body");
const movie = require("./main");
const http = require("http");
const fs = require("fs");

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {import("url").UrlWithParsedQuery} url
 * @returns {boolean}
 */
module.exports = function (req, res, url) {
        var thumb;
	if (req.method != "POST" || url.path != "/goapi/saveMovie/") return;
	loadPost(req, res).then(([data, mId]) => {
		const trigAutosave = data.is_triggered_by_autosave;
		if (trigAutosave && !data.movieId) {
                        thumb = fs.readFileSync(process.env.THUMB_URL);
                } else {
                        thumb = data.thumbnail_large && Buffer.from(data.thumbnail_large, "base64");
                }

		var body = Buffer.from(data.body_zip, "base64");
		movie.save(body, thumb, mId, data.presaveId).then((nId) => res.end("0" + nId));
	});
	return true;
};
