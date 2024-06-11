import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import * as schema from "@/globals/schema"
import path from "path"
import fs from "fs"

if (!fs.existsSync('../data/builds')) fs.mkdirSync('../data/builds', { recursive: true })

const sqlite = new Database('../data/database.sqlite')
const db = drizzle(sqlite, {
	schema
})

export default Object.assign(db, {
	schema,

	buildFile(build: { md5: string }) {
		return path.resolve('../data/builds', build.md5)
	}
})