import { useRoutes } from 'react-router-dom';
import { commonRoutes } from './commonRoutes';
import { publicRoutes } from './publicRoutes';
import { marketingRoutes } from './marketingRoutes';
import { adminRoutes } from './adminRoutes';

export const AppRoutes = () => {
  const routes = useRoutes([
    commonRoutes,
    publicRoutes,
    marketingRoutes,
    adminRoutes,
  ]);
  return routes;
};
