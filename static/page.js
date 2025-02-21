const fUtil = require("../misc/file");
const stuff = require("./info");
const http = require("http");

function toAttrString(table) {
	return typeof table == "object"
		? Object.keys(table)
				.filter((key) => table[key] !== null)
				.map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(table[key])}`)
				.join("&")
		: table.replace(/"/g, '\\"');
}
function toParamString(table) {
	return Object.keys(table)
		.map((key) => `<param name="${key}" value="${toAttrString(table[key])}">`)
		.join(" ");
}
function toObjectString(attrs, params) {
	return `<object ${Object.keys(attrs)
		.map((key) => `${key}="${attrs[key].replace(/"/g, '\\"')}"`)
		.join(" ")}>${toParamString(params)}</object>`;
}

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {import("url").UrlWithParsedQuery} url
 * @returns {boolean}
 */
module.exports = function (req, res, url) {
	if (req.method != "GET") return;
	const query = url.query;

	var attrs, params, title, makeCenter, ut;
	if (process.env.LOGED_IN == "Y") { ut = "23"; } else { ut = "10"; }
	switch (url.pathname) {
		case "/cc": {
			title = 'Character Creator';
                        makeCenter = true;
			attrs = {
				data: process.env.SWF_URL + '/cc.swf', // data: 'cc.swf',
                                id: "char_creator",
				type: 'application/x-shockwave-flash', 
                                width: "960px",
                                height: "600px",
			};
			params = {
				flashvars: {
					apiserver: "/",
					storePath: process.env.STORE_URL + "/<store>",
					clientThemePath: process.env.CLIENT_URL + "/<client_theme>",
					original_asset_id: query["id"] || null,
					themeId: "family",
					ut: 60,
					bs: "adam",
					appCode: "go",
					page: "",
					siteId: "0",
					m_mode: "school",
					isLogin: "Y",
					isEmbed: 1,
					ctc: "go",
					tlang: "en_US",
                    nextUrl: "/cc_browser",
				},
                                allowScriptAccess: "always",
				movie: process.env.SWF_URL + "/cc.swf", // 'http://localhost/cc.swf'
			};
			break;
		}

		case "/cc_browser": {
			title = "Character Browser";
			attrs = {
				data: process.env.SWF_URL + "/cc_browser.swf", // data: 'cc_browser.swf',
				type: "application/x-shockwave-flash",
				height: "100%",
                                width: "100%",
			};
			params = {
				flashvars: {
					apiserver: "/",
					storePath: process.env.STORE_URL + "/<store>",
					clientThemePath: process.env.CLIENT_URL + "/<client_theme>",
					original_asset_id: query["id"] || null,
					themeId: "family",
					ut: 60,
					appCode: "go",
					page: "",
					siteId: "0",
					m_mode: "school",
					isLogin: "Y",
					retut: 0,
					goteam_draft_only: 0,
					isEmbed: 1,
					ctc: "go",
					tlang: "en_US",
					lid: 13,
				},
				allowScriptAccess: "always",
				movie: process.env.SWF_URL + "/cc_browser.swf", // 'http://localhost/cc_browser.swf'
			};
			break;
		}

		case "/go_full":
		case "/go_full/tutorial": {
			let presave =
				query.movieId && query.movieId.startsWith("m")
					? query.movieId
					: `m-${fUtil[query.noAutosave ? "getNextFileId" : "fillNextFileId"]("movie-", ".xml")}`;
			title = "Video Editor";
			attrs = {
				data: process.env.SWF_URL + "/go_full.swf",
				type: "application/x-shockwave-flash",
				height: "100%", 
                                width: "100%"
			};
			params = {
				flashvars: {
					apiserver: "/",
					storePath: process.env.STORE_URL + "/<store>",
                                        tts_enabled: 1,
			                upl: 1,
			                hb: 1,
			                pts: 0,
			                credits: 100,
			                themeColor: "silver",
			                uisa: "Y",
			                ve: "Y",
			                isEmbed: 1,
			                isVideoRecord: 1,
		                        userId: 2152,
			                m_mode: "Y",
			                appCode: "go",
			                is_golite_preview: 0,
			                collab: 0,
			                ctc: "go",
					presaveId: presave,
			                goteam_draft_only: 0,
			                isLogin: "Y",
			                isWide: 1,
			                stutype: "tiny_studio",
			                tutorial: 1,
			                lid: 13,
			                movieLid: 0,
			                has_asset_bg: "0",
			                has_asset_char: "0",
					clientThemePath: process.env.CLIENT_URL + "/<client_theme>",
					themeId: "family",
                                        gocoins: 100,
			                page: "",
			                retut: 0,
		        	        siteId: "0",
			                tray: "custom",
			                tlang: "en_US",
			                ut: 30,
					nextUrl: "../pages/html/list.html",
					tutorial: 1,
				},
				allowScriptAccess: "always",
				allowFullScreen: "true",
			};
			break;
		}

		case "/player": {
			title = "Video Player";
			attrs = {
				data: process.env.SWF_URL + "/player.swf",
				type: "application/x-shockwave-flash",
				height: "100%",
                                width: "100%"
			};
			params = {
				flashvars: {
					apiserver: "/",
					storePath: process.env.STORE_URL + "/<store>",
			                userId: "2152",
			                lid: 13,
			                siteId: "0",
			                isEmbed: 1,
					thumbnailURL: "/movie_thumbs/${mId}.png",
					isEmbed: 1,
					autostart: 0,
					isWide: 1,
					clientThemePath: process.env.CLIENT_URL + "/<client_theme>",
				},
				allowScriptAccess: "always",
				allowFullScreen: "true",
			};
			break;
		}

		case "/recordWindow": {
			title = "Record Window";
			attrs = {
				data: process.env.SWF_URL + "/player.swf",
				type: "application/x-shockwave-flash",
				height: "100%",
                                width: "100%",
				quality: "medium",
			};
			params = {
				flashvars: {
					apiserver: "/",
					storePath: process.env.STORE_URL + "/<store>",
			                userId: "2152",
			                lid: 13,
			                siteId: "0",
			                isEmbed: 1,
					thumbnailURL: "/movie_thumbs/${mId}.png",
					isEmbed: 1,
					autostart: 0,
					isWide: 1,
					clientThemePath: process.env.CLIENT_URL + "/<client_theme>",
				},
				allowScriptAccess: "always",
				allowFullScreen: "true",
			};
			break;
		}

		default:
			return;
	}
	res.setHeader("Content-Type", "text/html; charset=UTF-8");
	Object.assign(params.flashvars, query);
        if (makeCenter) {
                res.end(`<script>document.title='${title}',flashvars=${JSON.stringify(params.flashvars)}</script><body style="margin:0px"><br><center>${toObjectString(attrs, params)}</center></body>${stuff.pages[url.pathname] || ''}`)
        } else {
	        res.end(`<script>document.title='${title}',flashvars=${JSON.stringify(params.flashvars)}</script><body style="margin:0px">${toObjectString(attrs, params)}</body>${stuff.pages[url.pathname] || ''}`)
        }
	return true;
};
