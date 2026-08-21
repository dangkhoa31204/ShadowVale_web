import type { RouteObject } from 'react-router-dom';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { PostsPage } from '../pages/marketing/Posts/PostsPage';
import { PostDetailsPage } from '../pages/marketing/PostDetails/PostDetailsPage';
import { SlidersPage } from '../pages/marketing/Sliders/SlidersPage';
import { SliderDetailsPage } from '../pages/marketing/SliderDetails/SliderDetailsPage';

export const marketingRoutes: RouteObject = {
  element: <MarketingLayout />,
  children: [
    { path: '/marketing/posts', element: <PostsPage /> },
    { path: '/marketing/posts/:id', element: <PostDetailsPage /> },
    { path: '/marketing/sliders', element: <SlidersPage /> },
    { path: '/marketing/sliders/:id', element: <SliderDetailsPage /> },
  ],
};
