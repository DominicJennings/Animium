const fs = require("fs");
const folder = process.env.WAVEFORMS_FOLDER;

module.exports = {
	/**
	* Looks for a match in the _WAVEFORMS folder.
	* If there's no match found, it returns null.
	* @param {string} wfId 
	* @returns {Buffer | null}
	*/
	load(wfId) { // look for match in folder
		const match = fs.readdirSync(folder).find(file => file.includes(`${wfId}.wf`));
		return match ? fs.readFileSync(path.join(folder, match)) : null;
	},
	/**
	 * Saves the waveform to the _WAVEFORMS folder.
	 * @param {Buffer} wf 
	 * @param {string} wfId 
	 * @returns {boolean}
	 */
	save(wf, wfId) {
		fs.writeFileSync(path.join(folder, `${wfId}.wf`), wf);
		return true;
	}
};
