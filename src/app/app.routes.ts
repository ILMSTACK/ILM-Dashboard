import { Routes } from '@angular/router';
import { AuthGuard } from './services/auth/auth.guard';

export const routes: Routes = [
     {
        path: '',
        redirectTo: '/admin',
        pathMatch: 'full'
      },
      {
        path: 'admin',
        loadChildren: () => import('./components/views/admin/dashboard/dashboard.routes').then(m => m.dashboardRoutes)
      }
];