const loadPost = require("../misc/post_body");
const wf = require("./main");
const http = require("http");

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {import("url").UrlWithParsedQuery} url
 * @returns {boolean}
 */
module.exports = function (req, res, url) {
  if (req.method != "POST" || url.path != "/goapi/saveWaveform/") return;
	loadPost(req, res).then(data => {

		const { wfid: wfId, waveform } = data;

		const waveformId = wf.save(waveform, wfId);
		res.end("0" + waveformId);
		return true;
	});
};
