import { createImageUploadHandlers } from '@/app/api/lib/imageUploadRoute';

const handlers = createImageUploadHandlers(5 * 1024 * 1024);

export const POST = handlers.POST;
export const GET = handlers.GET;
