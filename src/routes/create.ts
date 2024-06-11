import { server, apiRouter } from "@/index"
import env from "@/globals/env"
import { buildStatus } from "@/globals/schema"
import crypto from "crypto"
import fs from "fs"
import { eq } from "drizzle-orm"

export = new apiRouter.Path('/')
	.validate(new server.Validator()
		.httpRequest((ctr, end) => {
			if (ctr.headers.get('authorization', '') !== env.CREATE_KEY) return end(ctr.status(ctr.$status.UNAUTHORIZED).print({ error: 'Unauthorized' }))
		})
		.use({})
	)
	.http('POST', '/', (http) => http
		.document({
			description: 'Create new build',
			responses: {
				200: {
					description: 'Success',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									url: {
										type: 'string'
									}
								}, required: ['url']
							}
						}
					}
				}, 400: {
					description: 'Invalid body',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									error: {
										type: 'string'
									}
								}, required: ['error']
							}
						}
					}
				}, 401: {
					description: 'Unauthorized',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									error: {
										type: 'string'
									}
								}, required: ['error']
							}
						}
					}
				}, 409: {
					description: 'Build already exists',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									error: {
										type: 'string'
									}
								}, required: ['error']
							}
						}
					}
				}
			}, requestBody: {
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								project: {
									type: 'string'
								}, version: {
									type: 'string'
								}, build: {
									type: 'string'
								}, result: {
									type: 'string',
									enum: Array.from(buildStatus)
								}, timestamp: {
									type: 'integer'
								}, duration: {
									type: 'integer'
								}, fileExtension: {
									type: 'string'
								}, commits: {
									type: 'array',
									items: {
										type: 'object',
										properties: {
											author: {
												type: 'string'
											}, email: {
												type: 'string'
											}, description: {
												type: 'string'
											}, hash: {
												type: 'string'
											}, timestamp: {
												type: 'integer'
											}
										}, required: [
											'author', 'email', 'description',
											'hash', 'timestamp'
										]
									}
								}, flags: {
									type: 'array',
									items: {
										type: 'string'
									}
								}
							}, required: [
								'project', 'version', 'build',
								'result', 'timestamp', 'duration',
								'fileExtension', 'commits', 'flags'
							]
						}
					}
				}
			}
		})
		.onRequest(async(ctr) => {
			const [ data ] = await ctr.bindBody((z) => z.object({
				project: z.string(),
				version: z.string(),
				build: z.string(),
				result: z.enum(buildStatus),
				timestamp: z.number().int().positive(),
				duration: z.number().int().positive(),
				fileExtension: z.string(),
				commits: z.object({
					author: z.string(),
					email: z.string(),
					description: z.string(),
					hash: z.string(),
					timestamp: z.number().int().positive()
				}).array(),
				flags: z.string().array()
			}))

			if (!data) return ctr.status(ctr.$status.BAD_REQUEST).print({ error: 'Invalid body' })

			let project = await ctr["@"].database.query.projects.findFirst({
				columns: {
					id: true
				}, where: (projects, { eq }) =>
						eq(projects.name, data.project)
			})

			if (!project) project = await ctr["@"].database.insert(ctr["@"].database.schema.projects)
				.values({ name: data.project })
				.returning({ id: ctr["@"].database.schema.projects.id })
				.get()

			let version = await ctr["@"].database.query.versions.findFirst({
				columns: {
					id: true
				}, where: (versions, { eq }) =>
						eq(versions.name, data.version)
			})

			if (!version) version = await ctr["@"].database.insert(ctr["@"].database.schema.versions)
				.values({ name: data.version, projectId: project.id })
				.returning({ id: ctr["@"].database.schema.versions.id })
				.get()

			const build = await ctr["@"].database.query.builds.findFirst({
				columns: {
					id: true
				}, where: (builds, { and, eq }) =>
					and(
						eq(builds.build, data.build),
						eq(builds.versionId, version.id)
					)
			})

			if (build) return ctr.status(ctr.$status.CONFLICT).print({ error: 'Build already exists' })

			const { id } = await ctr["@"].database.insert(ctr["@"].database.schema.builds)
				.values({
					build: data.build,
					commits: data.commits,
					fileExtension: data.fileExtension,
					ready: false,
					versionId: version.id,
					timestamp: data.timestamp,
					duration: data.duration,
					result: data.result,
					md5: '',
					sha256: '',
					sha512: '',
					flags: data.flags
				})
				.returning({ id: ctr["@"].database.schema.builds.id })
				.get()

			return ctr.print({ url: `/v2/create/upload/${id}` })
		})
	)
	.http('POST', '/upload/{build}', (http) => http
		.document({
			description: 'Upload build',
			responses: {
				200: {
					description: 'Success',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {}
							}
						}
					}
				}, 400: {
					description: 'Invalid build',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									error: {
										type: 'string'
									}
								}, required: ['error']
							}
						}
					}
				}, 401: {
					description: 'Unauthorized',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									error: {
										type: 'string'
									}
								}, required: ['error']
							}
						}
					}
				}, 404: {
					description: 'Build not found',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									error: {
										type: 'string'
									}
								}, required: ['error']
							}
						}
					}
				}
			}, requestBody: {
				content: {
					'text/plain': {
						schema: {
							type: 'string',
							format: 'binary'
						}
					}
				}
			}, parameters: [
				{
					in: 'path',
					name: 'build',
					required: true,
					description: 'The build to upload',
					schema: {
						type: 'string'
					}
				}
			]
		})
		.onRequest(async(ctr) => {
			const buildInt = parseInt(ctr.params.get('build', ''))
			if (isNaN(buildInt) || buildInt < 1) return ctr.status(ctr.$status.BAD_REQUEST).print({ error: 'Invalid build' })

			const build = await ctr["@"].database.query.builds.findFirst({
				columns: {
					id: true,
					ready: true
				}, where: (builds, { and, eq }) =>
					and(
						eq(builds.id, buildInt),
						eq(builds.ready, false)
					)
			})

			if (!build) return ctr.status(ctr.$status.NOT_FOUND).print({ error: 'Build not found' })

			const data = await ctr.$body().arrayBuffer()

			const md5 = crypto.createHash('md5').update(data).digest('hex'),
				sha256 = crypto.createHash('sha256').update(data).digest('hex'),
				sha512 = crypto.createHash('sha512').update(data).digest('hex')

			const file = await ctr["@"].database.buildFile({ md5 })

			await fs.promises.writeFile(file, data)

			await ctr["@"].database.update(ctr["@"].database.schema.builds)
				.set({
					md5, sha256, sha512,
					ready: true
				})
				.where(eq(ctr["@"].database.schema.builds.id, build.id))
				.run()

			return ctr.print({})
		})
	)