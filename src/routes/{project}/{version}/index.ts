import { server, apiRouter } from "@/index"

server.schema('build', {
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
			enum: ['success', 'failure']
		}, timestamp: {
			type: 'integer'
		}, duration: {
			oneOf: [
				{ type: 'integer' },
				{ type: 'null' }
			]
		}, md5: {
			type: 'string'
		}, sha256: {
			type: 'string'
		}, sha512: {
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
					'author', 'email',
					'description', 'hash',
					'timestamp'
				]
			}
		}, flags: {
			type: 'array',
			items: {
				type: 'string'
			}
		}
	}, required: [
		'project', 'version',
		'build', 'result', 'timestamp',
		'duration', 'md5', 'sha256',
		'sha512', 'commits', 'flags'
	]
})

function transformBuild(build: object, project: string, version: string) {
	return {
		project: project,
		version: version,
		...build
	}
}

export = new apiRouter.Path('/')
	.http('GET', '/', (http) => http
		.document({
			description: 'Get a project\'s version',
			responses: {
				200: {
					description: 'Success',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									project: {
										type: 'string'
									}, version: {
										type: 'string'
									},

									builds: {
										type: 'object',
										properties: {
											latest: {
												$ref: '#/components/schemas/build'
											}, all: {
												type: 'array',
												items: {
													$ref: '#/components/schemas/build'
												}
											}
										}, required: ['latest', 'all']
									}
								}, required: ['project', 'version', 'builds']
							}
						}
					}
				}, 404: {
					description: 'Project or Version not found',
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
			}, parameters: [
				{
					in: 'path',
					name: 'project',
					required: true,
					description: 'The name of the project to get',
					schema: {
						type: 'string'
					}
				},
				{
					in: 'path',
					name: 'version',
					required: true,
					description: 'The version of the project to get',
					schema: {
						type: 'string'
					}
				}
			]
		})
		.onRequest(async(ctr) => {
			const project = await ctr["@"].database.query.projects.findFirst({
				columns: {
					id: true,
					name: true
				}, with: {
					versions: {
						limit: 1,
						columns: {
							name: true
						}, with: {
							builds: {
								columns: {
									build: true,
									result: true,
									timestamp: true,
									duration: true,
									md5: true,
									sha256: true,
									sha512: true,
									commits: true,
									flags: true
								}, orderBy: (builds, { asc }) => asc(builds.id),
								where: (builds, { eq }) =>
										eq(builds.ready, true)
							}
						}, orderBy: (versions, { asc }) => asc(versions.id),
						where: (versions, { eq }) =>
								eq(versions.name, ctr.params.get('version', ''))
					}
				}, where: (projects, { eq }) =>
						eq(projects.name, ctr.params.get('project', ''))
			})

			if (!project) return ctr.status(ctr.$status.NOT_FOUND).print({
				error: 'Project not found'
			})

			const version = project.versions[0]

			if (!version) return ctr.status(ctr.$status.NOT_FOUND).print({
				error: 'Version not found'
			})

			return ctr.print({
				project: project.name,
				version: version.name,
				builds: {
					latest: transformBuild(version.builds[version.builds.length - 1], project.name, version.name),
					all: version.builds.map((build) => transformBuild(build, project.name, version.name))
				}
			})
		})
	)