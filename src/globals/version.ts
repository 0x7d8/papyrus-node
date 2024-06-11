import fs from "fs"

const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf8')),
	version = packageJson.version

export default version as string