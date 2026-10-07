import { Request, Response } from 'express';
import { blogsService } from './blogs.service.js';
import { sendCreated, sendSuccess } from '../../core/utils/responseHandler.js';
import { renderStructuredDocument, structuredDocumentSchema } from '../communications/contentDocument.js';
import {
  blogAdminQuerySchema,
  blogIdSchema,
  blogPublicQuerySchema,
  blogSlugSchema,
  blogStateSchema,
  bulkArchiveBlogsSchema,
  createBlogSchema,
  updateBlogSchema,
} from './blogs.schema.js';

export const blogsController = {
  async preview(req: Request, res: Response) {
    const document = structuredDocumentSchema.parse(req.body.editorJson);
    sendSuccess(res, renderStructuredDocument(document, 'blog'), 'Blog preview rendered.');
  },
  async getPublic(req: Request, res: Response) {
    const query = blogPublicQuerySchema.parse(req.query);
    const { data, meta } = await blogsService.getPublic(query.page, query.limit, query.search);
    sendSuccess(res, data, 'Blogs fetched.', 200, meta);
  },

  async getPublishedBySlug(req: Request, res: Response) {
    const slug = blogSlugSchema.parse(req.params.slug);
    sendSuccess(res, await blogsService.getPublishedBySlug(slug), 'Blog fetched.');
  },

  async getAdmin(req: Request, res: Response) {
    const query = blogAdminQuerySchema.parse(req.query);
    const { data, meta } = await blogsService.getAdmin(query);
    sendSuccess(res, data, 'Admin blogs fetched.', 200, meta);
  },

  async getStats(_req: Request, res: Response) {
    sendSuccess(res, await blogsService.stats(), 'Blog statistics fetched.');
  },

  async getAdminById(req: Request, res: Response) {
    const id = blogIdSchema.parse(req.params.id);
    sendSuccess(res, await blogsService.getAdminById(id), 'Blog fetched.');
  },

  async create(req: Request, res: Response) {
    const input = createBlogSchema.parse(req.body);
    const blog = await blogsService.create({ ...input, authorId: req.user!.id });
    sendCreated(res, blog, 'Draft created.');
  },

  async update(req: Request, res: Response) {
    const id = blogIdSchema.parse(req.params.id);
    const input = updateBlogSchema.parse(req.body);
    sendSuccess(res, await blogsService.update(id, input), 'Blog saved.');
  },

  async changeState(req: Request, res: Response) {
    const id = blogIdSchema.parse(req.params.id);
    const input = blogStateSchema.parse(req.body);
    sendSuccess(res, await blogsService.changeState(id, input.expectedVersion, input.action), `Blog ${input.action} completed.`);
  },

  async bulkArchive(req: Request, res: Response) {
    const { ids } = bulkArchiveBlogsSchema.parse(req.body);
    const result = await blogsService.bulkArchive(ids);
    sendSuccess(res, result, `${result.archived} blogs archived.`);
  },
};
