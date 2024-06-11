import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"

export const buildStatus = ['SUCCESS', 'FAILURE'] as const

export const projects = sqliteTable('projects', {
  id: integer('id', { mode: 'number' }).notNull().primaryKey(),

  name: text('name').notNull().unique()
})

export const projectRelations = relations(projects, ({ many }) => ({
	versions: many(versions)
}))

export const versions = sqliteTable('versions', {
	id: integer('id', { mode: 'number' }).notNull().primaryKey(),
	projectId: integer('project_id', { mode: 'number' }).notNull(),

	name: text('name').notNull()
})

export const versionRelations = relations(versions, ({ many, one }) => ({
	builds: many(builds),
	project: one(projects, {
		fields: [versions.projectId],
		references: [projects.id]
	})
}))

export const builds = sqliteTable('builds', {
	id: integer('id', { mode: 'number' }).notNull().primaryKey(),
	versionId: integer('version_id', { mode: 'number' }).notNull(),

	ready: integer('ready', { mode: 'boolean' }).notNull(),
	fileExtension: text('file_extension').notNull(),
	build: text('build').notNull(),
	result: text('result', { enum: buildStatus }).notNull(),
	timestamp: integer('timestamp', { mode: 'number' }).notNull(),
	duration: integer('duration', { mode: 'number' }),
	md5: text('md5', { length: 32 }).notNull(),
	sha256: text('sha256', { length: 64 }).notNull(),
	sha512: text('sha512', { length: 128 }).notNull(),

	commits: text('commits', { mode: 'json' }).notNull(),
	flags: text('flags', { mode: 'json' }).notNull()
})

export const buildRelations = relations(builds, ({ one }) => ({
	version: one(versions, {
		fields: [builds.versionId],
		references: [versions.id]
	})
}))