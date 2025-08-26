import { Routes } from '@angular/router';
import { AuthGuard } from './services/auth/auth.guard';
import { NotionCallbackComponent } from './components/notion-callback/notion-callback.component';
import { LoginComponent } from './components/auth/login/login.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/admin',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadChildren: () => import('./components/views/admin/dashboard/dashboard.routes').then(m => m.dashboardRoutes)
  },
  {
    path: 'notion-callback',
    component: NotionCallbackComponent
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];