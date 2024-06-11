import { apiRouter } from "@/index"

export = new apiRouter.Path('/')
	.document({
		parameters: [
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
			},
			{
				in: 'path',
				name: 'build',
				required: true,
				description: 'The build of the version to get',
				schema: {
					type: 'string'
				}
			}
		]
	})
	.http('GET', '/', (http) => http
		.document({
			description: 'Get a version\'s build',
			responses: {
				200: {
					description: 'Success',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/build'
							}
						}
					}
				}, 404: {
					description: 'Project, Version or Build not found',
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
			}
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
							id: true,
							name: true
						}
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

			const build = await ctr["@"].database.query.builds.findFirst({
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
				}, where: (builds, { and, eq }) =>
					and(
						eq(builds.build, ctr.params.get('build', '')),
						eq(builds.versionId, version.id),
						eq(builds.ready, true)
					)
			})

			return ctr.print({
				project: project.name,
				version: version.name,
				...build
			})
		})
	)
	.http('GET', '/download', (http) => http
		.document({
			description: 'Download a build',
			responses: {
				200: {
					description: 'Success',
					content: {
						'application/octet-stream': {
							schema: {
								type: 'string',
								format: 'binary'
							}
						}
					}
				}, 404: {
					description: 'Project, Version or Build not found',
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
			}
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
							id: true,
							name: true
						}, with: {
							builds: {
								columns: {
									build: true,
									fileExtension: true
								}
							}
						}
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

			const build = await ctr["@"].database.query.builds.findFirst({
				columns: {
					build: true,
					md5: true,
					fileExtension: true
				}, where: (builds, { and, eq }) =>
					and(
						eq(builds.build, ctr.params.get('build', '')),
						eq(builds.versionId, version.id),
						eq(builds.ready, true)
					)
			})

			if (!build) return ctr.status(ctr.$status.NOT_FOUND).print({
				error: 'Build not found'
			})

			return ctr.printFile(ctr["@"].database.buildFile(build), {
				download: true,
				addTypes: false,
				name: `${project.name}-${version.name}-${build.build}.${build.fileExtension}`
			})
		})
	)