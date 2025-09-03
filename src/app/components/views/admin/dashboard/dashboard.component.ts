import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';

// Angular Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';

// Services
import { AuthService } from '../../../../services/auth/auth.service';
import { GlobalStoreService } from '../../../../services/store/global-state/global-store.service';

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
    MatMenuModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  // Sidebar state
  sidebarOpen = signal(true);

  // Current user info
  currentUser: any = null;

  // Navigation items
  navigationItems = [
    {
      name: 'Analytics',
      route: 'home',
      icon: 'analytics',
      description: 'Data insights & reports'
    },
    {
      name: 'Customers',
      route: 'customers',
      icon: 'people',
      description: 'Manage customer relationships'
    },
    {
      name: 'Email Campaigns',
      route: 'campaigns',
      icon: 'email',
      description: 'Marketing & communication'
    },
    {
      name: 'User Story',
      route: 'example2',
      icon: 'science',
      description: 'Test case & Task'
    },
    {
      name: 'KPI',
      route: 'example2',
      icon: 'science',
      description: ''
    },

  ];

  private destroy$ = new Subject<void>();

  constructor(
    public router: Router,
    private authService: AuthService,
    private globalStore: GlobalStoreService
  ) {}

  ngOnInit(): void {
    // Get current user info
    this.currentUser = this.authService.getCurrentUser();
    
    // If no user from token, get from global store
    if (!this.currentUser) {
      this.globalStore.userName$.subscribe(userName => {
        if (userName) {
          this.currentUser = {
            name: userName,
            email: 'admin@gmail.com',
            role: 'Admin'
          };
        }
      });
    }
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

  // User menu actions
  openProfile(): void {
    // Implement profile functionality
    console.log('Open profile');
    // You can navigate to a profile page or open a modal
    // this.router.navigate(['/admin/profile']);
  }

  openPreferences(): void {
    // Implement preferences functionality
    console.log('Open preferences');
    // You can navigate to preferences page or open a modal
    // this.router.navigate(['/admin/preferences']);
  }

  // Logout functionality
  logout(): void {
    // Show confirmation dialog (optional)
    const confirmLogout = confirm('Are you sure you want to sign out?');
    
    if (confirmLogout) {
      this.authService.logout().subscribe({
        next: (response) => {
          if (response.success) {
            // Clear any additional app state if needed
            console.log('Logged out successfully');
            
            // Navigate to login page
            this.router.navigate(['/login']);
          }
        },
        error: (error) => {
          console.error('Logout error:', error);
          // Even if logout fails on server, clear local state and redirect
          this.router.navigate(['/login']);
        }
      });
    }
  }
}