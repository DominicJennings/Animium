const folder = process.env.SAVED_FOLDER;
const caché = require("../asset/caché");
const fUtil = require("../misc/file");
const nodezip = require("node-zip");
const parse = require("../movie/parse");
const fs = require("fs");
const truncate = require("truncate");

module.exports = {
	/**
	 *
	 * @param {Buffer} starterZip
	 * @returns {Promise<string>}
	 */
	save(starterZip, thumb, mId = false) {
		return new Promise(async (res, rej) => {
			var zip = nodezip.unzip(starterZip);
			var sId, thumbFile, path, resD;
			if (!mId) {
				sId = fUtil.getNextFileId("starter-", ".xml");
				thumbFile = fUtil.getFileIndex("starter-", ".png", sId);
				path = fUtil.getFileIndex("starter-", ".xml", sId);
				resD = `s-${sId}`;
			} else {
				sId = mId;
				thumbFile = `${folder}/${sId}.png`;
				path = `${folder}/${sId}.xml`;
				resD = sId;
			}
			fs.writeFileSync(thumbFile, thumb);
			var writeStream = fs.createWriteStream(path);
			parse.unpackMovie(zip, thumb).then((data) => {
				writeStream.write(data, () => {
					writeStream.close();
					res(resD);
				});
			});
				
				
		});
	},
	thumb(movieId) {
		return new Promise(async (res, rej) => {
			if (!movieId.startsWith("s-")) return;
			const n = Number.parseInt(movieId.substr(2));
			const fn = fUtil.getFileIndex("starter-", ".png", n);
			isNaN(n) ? rej() : res(fs.readFileSync(fn));
		});
	},
	list() {
		const table = [];
		var ids = fUtil.getValidFileIndicies("starter-", ".xml");
		if (!ids) fs.readdirSync(folder).forEach(fn => {
			if (!fn.includes(".xml") && !fn.includes("starter-")) return;
			// check if the starter and thumbnail exists
			const sId = fn.substring(0, fn.length - 4);
			const starter = fs.existsSync(`${folder}/${sId}.xml`);
			const thumb = fs.existsSync(`${folder}/${sId}.png`);
			if (starter && thumb) table.unshift({ id: sId });
		}); else for (const i in ids) {
			var id = `s-${ids[i]}`;
			table.unshift({ id: id });
		}
		return table;
	},
	meta(movieId) {
		return new Promise(async (res, rej) => {
			if (!movieId.startsWith("s-")) return;
			const n = Number.parseInt(movieId.substr(2));
			const fn = fUtil.getFileIndex("starter-", ".xml", n);

			const fd = fs.openSync(fn, "r");
			const buffer = Buffer.alloc(256);
			fs.readSync(fd, buffer, 0, 256, 0);
			const begTitle = buffer.indexOf("<title>") + 16;
			const endTitle = buffer.indexOf("]]></title>");
			const title = buffer.slice(begTitle, endTitle).toString().trim();

			fs.closeSync(fd);
			res({
				date: fs.statSync(fn).mtime,
				title: title,
				id: movieId,
			});
		});
	},
};
