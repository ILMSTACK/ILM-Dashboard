import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { ExampleNavComponent } from '../nav_items/example-nav/example-nav.component';
import { ExampleNav2Component } from '../nav_items/example-nav2/example-nav2.component';

export const dashboardRoutes: Routes = [
    {
        path: '',
        component: DashboardComponent,
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                component: DashboardComponent
            },
            {
                path: 'example1',
                component: ExampleNavComponent
            },
            {
                path: 'example2',
                component: ExampleNav2Component
            }
        ]
    },
];