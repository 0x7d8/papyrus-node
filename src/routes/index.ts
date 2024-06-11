import { apiRouter } from "@/index"

export = new apiRouter.Path('/')
	.http('GET', '/', (http) => http
		.document({
			description: 'List all projects',
			responses: {
				200: {
					description: 'Success',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									projects: {
										type: 'array',
										items: {
											type: 'string'
										}
									}
								}, required: ['projects']
							}
						}
					}
				}
			}
		})
		.onRequest(async(ctr) => {
			const projects = await ctr["@"].database.query.projects.findMany({
				columns: {
					name: true
				}
			})

			return ctr.print({
				projects: projects.map((project) => project.name)
			})
		})
	)