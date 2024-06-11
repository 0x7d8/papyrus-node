import { filesystem } from "@rjweb/utils"
import { z } from "zod"

let env: Record<string, string>
try {
	env = filesystem.env('../.env', { async: false })
} catch {
	try {
		env = filesystem.env('../../.env', { async: false })
	} catch {
		env = process.env as Record<string, string>
	}
}

const infos = z.object({
	PORT: z.string().transform((str) => parseInt(str)),

	OPENAPI_TITLE: z.string(),
	OPENAPI_URL: z.string(),
	CREATE_KEY: z.string(),

	LOG_LEVEL: z.union([ z.literal('none'), z.literal('info'), z.literal('debug') ])
})

export type Environment = z.infer<typeof infos>

export default infos.parse(env)