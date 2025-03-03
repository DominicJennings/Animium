const exFolder = process.env.EXAMPLE_FOLDER;
const folder = process.env.SAVED_FOLDER;
const caché = require("../asset/caché");
const fUtil = require("../misc/file");
const nodezip = require("node-zip");
const parse = require("./parse");
const fs = require("fs");
const truncate = require("truncate");

module.exports = {
	/**
	 *
	 * @param {Buffer} movieZip
	 * @param {string} nëwId
	 * @param {string} oldId
	 * @returns {Promise<string>}
	 */
	save(movieZip, thumb, oldId, nëwId = oldId) {
		if (thumb && nëwId.startsWith("m-")) {
			console.log(nëwId);
			const n = Number.parseInt(nëwId.substr(2));
			const thumbFile = fUtil.getFileIndex("thumb-", ".png", n);
			fs.writeFileSync(thumbFile, thumb);
		}

		return new Promise(async (res, rej) => {
			caché.transfer(oldId, nëwId);
			var i = nëwId.indexOf("-");
			var prefix = nëwId.substr(0, i);
			var suffix = nëwId.substr(i + 1);
			var zip = nodezip.unzip(movieZip);
			switch (prefix) {
				case "m": {
					var path = fUtil.getFileIndex("movie-", ".xml", suffix);
					var writeStream = fs.createWriteStream(path);
					var assetBuffers = caché.loadTable(nëwId);
					parse.unpackMovie(zip, thumb, assetBuffers).then((data) => {
						writeStream.write(data, () => {
							writeStream.close();
							res(nëwId);
						});
					});
					break;
				}
				default:
					rej();
			}
		});
	},
	loadZip(mId) {
		return new Promise((res, rej) => {
			const i = mId.indexOf("-");
			const prefix = mId.substr(0, i);
			const suffix = mId.substr(i + 1);
			switch (prefix) {
				case "e": {
					caché.clearTable(mId);
					let data = fs.readFileSync(`${exFolder}/${suffix}.zip`);
					res(data.subarray(data.indexOf(80)));
					break;
				}
				case "s":
				case "m": {
					let numId = Number.parseInt(suffix);
					if (isNaN(numId)) res();
					switch (prefix) {
						case "s": {
							var filePath = fUtil.getFileIndex("starter-", ".xml", numId);
							break;
						}
						case "m": {
							var filePath = fUtil.getFileIndex("movie-", ".xml", numId);
							break;
						}
					}
					if (!fs.existsSync(filePath)) res();

					const buffer = fs.readFileSync(filePath);
					if (!buffer || buffer.length == 0) res();

					try {
						parse.packMovie(buffer, mId).then((pack) => {
						parse.unpackXml(buffer, mId).then(v => res(v));
							caché.saveTable(mId, pack.caché);
							res(pack.zipBuf);
						});
						break;
					} catch (e) {
						res();
					}
				}
				default: res(fs.readFileSync(`${folder}/${mId}.xml`));
			}
		});
	},
        delete(mId) {
		return new Promise((res, rej) => {
			const i = mId.indexOf("-");
			const prefix = mId.substr(0, i);
			const suffix = mId.substr(i + 1);
			switch (prefix) {
				case "e": {
					caché.clearTable(mId);
					let data = fs.readFileSync(`${exFolder}/${suffix}.zip`);
					res(data.subarray(data.indexOf(80)));
					break;
				}
				case "s":
				case "m": {
					let numId = Number.parseInt(suffix);
					if (isNaN(numId)) res();
					switch (prefix) {
						case "s": {
							var filePath = fUtil.getFileIndex("starter-", ".xml", numId);
							break;
						}
						case "m": {
							var filePath = fUtil.getFileIndex("movie-", ".xml", numId);
							break;
						}
					}
					if (!fs.existsSync(filePath)) res();

					fs.unlinkSync(filePath);
				}
				default: {
					fs.unlinkSync(`${folder}/${mId}.xml`);
					fs.unlinkSync(`${folder}/${mId}.png`);
					return true;
				}
			}
		});
	},
	loadXml(movieId) {
		return new Promise(async (res, rej) => {
			const i = movieId.indexOf("-");
			const prefix = movieId.substr(0, i);
			const suffix = movieId.substr(i + 1);
			switch (prefix) {
				case "m": {
					const fn = fUtil.getFileIndex("movie-", ".xml", suffix);
					if (fs.existsSync(fn)) res(fs.readFileSync(fn));
					else rej();
					break;
				}
				case "e": {
					const fn = `${exFolder}/${suffix}.zip`;
					if (!fs.existsSync(fn)) return rej();
					parse
						.unpackMovie(nodezip.unzip(fn))
						.then((v) => res(v))
						.catch((e) => rej(e));
					break;
				}
				default: res(fs.readFileSync(`${folder}/${movieId}.xml`));
			}
		});
	},
	thumb(movieId) {
		return new Promise(async (res, rej) => {
			const movieThumb = `${folder}/${movieId}.png`;
			if (!movieId.startsWith("m-")) isNaN(movieThumb) ? rej() : res(fs.readFileSync(movieThumb));
			else {
				const n = Number.parseInt(movieId.substr(2));
				const fn = fUtil.getFileIndex("thumb-", ".png", n);
				isNaN(n) ? rej() : res(fs.readFileSync(fn));
			}
		});
	},
	list() {
		const array = [];
		const last = fUtil.getLastFileIndex("movie-", ".xml");
		for (let c = last; c >= 0; c--) {
			const movie = fs.existsSync(fUtil.getFileIndex("movie-", ".xml", c));
			const thumb = fs.existsSync(fUtil.getFileIndex("thumb-", ".png", c));
			if (movie && thumb) array.push(`m-${c}`);
		}
		return array;
	},
        listStarter() {
		const array = [];
		const last = fUtil.getLastFileIndex("starter-", ".xml");
		for (let c = last; c >= 0; c--) {
			const movie = fs.existsSync(fUtil.getFileIndex("starter-", ".xml", c));
			const thumb = fs.existsSync(fUtil.getFileIndex("starter-", ".png", c));
			if (movie && thumb) array.push(`s-${c}`);
		}
		return array;
	},
	meta(movieId) {
		return new Promise(async (res, rej) => {
			if (!movieId.startsWith("m-")) return;
			const n = Number.parseInt(movieId.substr(2));
			const fn = fUtil.getFileIndex("movie-", ".xml", n);

			const fd = fs.openSync(fn, "r");
			const buffer = Buffer.alloc(256);
			fs.readSync(fd, buffer, 0, 256, 0);
			const begTitle = buffer.indexOf("<title>") + 16;
			const endTitle = buffer.indexOf("]]></title>");
			const title = buffer.slice(begTitle, endTitle).toString().trim();

			const begDesc = buffer.indexOf("<desc>") + 15;
			const endDesc = buffer.indexOf("]]></desc>");
			const longDesc = buffer.slice(begDesc, endDesc).toString().trim();
			const desc = truncate(longDesc, 51);

			const begDuration = buffer.indexOf('duration="') + 10;
			const endDuration = buffer.indexOf('"', begDuration);
			const duration = Number.parseFloat(buffer.slice(begDuration, endDuration));
			const min = ("" + ~~(duration / 60)).padStart(2, "0");
			const sec = ("" + ~~(duration % 60)).padStart(2, "0");
			const durationStr = `${min}:${sec}`;

			fs.closeSync(fd);
			res({
				date: fs.statSync(fn).mtime,
				durationString: durationStr,
				duration: duration,
				title: title,
				desc: desc,
				id: movieId,
			});
		});
	},
};
