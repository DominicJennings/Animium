const wf = require("./main");
const loadPost = require("../misc/post_body");

/**
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @param {import("url").UrlWithParsedQuery} url
 * @returns {boolean}
 */
module.exports = async function (req, res, url) {
	if (req.method != "POST" || url.pathname != "/goapi/getWaveform/") return;
	loadPost(req, res).then(data => {
		const { wfid: wfId } = data;

		const waveform = wf.load(wfId);
		waveform ? (res.statusCode = 200, res.end(waveform)) : (res.statusCode = 404, res.end());
		return true;
	});
}
