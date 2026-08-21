import type { RouteObject } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { BlogsPage } from '../pages/public/Blogs/BlogsPage';
import { BlogDetailsPage } from '../pages/public/BlogDetails/BlogDetailsPage';

export const publicRoutes: RouteObject = {
  element: <PublicLayout />,
  children: [
    { path: '/blogs', element: <BlogsPage /> },
    { path: '/blogs/:id', element: <BlogDetailsPage /> },
  ],
};
