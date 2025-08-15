import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';

// Angular Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatRippleModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  // Sidebar state
  sidebarOpen = signal(true);

  // Navigation items
  navigationItems = [
    {
      name: 'Home',
      route: 'home',
      icon: 'home',
      description: 'Dashboard home page'
    },
    {
      name: 'Example 1',
      route: 'example1',
      icon: 'explore',
      description: 'API Testing features'
    },
    {
      name: 'Example 2',
      route: 'example2',
      icon: 'science',
      description: 'Second example component'
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(public router: Router) {}

  ngOnInit(): void {
    // Initialize component
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Sidebar toggle
  toggleSidebar(): void {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  // Check if route is active
  isRouteActive(route: string): boolean {
    return this.router.url.includes(route);
  }
}