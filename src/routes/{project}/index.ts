import { apiRouter } from "@/index"

export = new apiRouter.Path('/')
	.http('GET', '/', (http) => http
		.document({
			description: 'Get a project',
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
									}, versions: {
										type: 'array',
										items: {
											type: 'string'
										}
									}
								}, required: ['project', 'versions']
							}
						}
					}
				}, 404: {
					description: 'Project not found',
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
				}
			]
		})
		.onRequest(async(ctr) => {
			const project = await ctr["@"].database.query.projects.findFirst({
				columns: {
					name: true
				}, with: {
					versions: {
						columns: {
							name: true
						}
					}
				}, where: (projects, { eq }) =>
						eq(projects.name, ctr.params.get('project', ''))
			})

			if (!project) return ctr.status(ctr.$status.NOT_FOUND).print({
				error: 'Project not found'
			})

			return ctr.print({
				project: project.name,
				versions: project.versions.map((version) => version.name)
			})
		})
	)