import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';

import {
  CsvService, Customer, CustomerMetrics
} from '../../../../services/insight/insight.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatProgressSpinnerModule,
    MatInputModule, MatTooltipModule, MatTabsModule
  ],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss']
})
export class CustomersComponent implements OnInit {
  private api = inject(CsvService);
  private router = inject(Router);

  // Customer Data
  customers = signal<Customer[]>([]);
  customerMetrics = signal<CustomerMetrics | null>(null);
  customersLoading = signal(false);
  selectedCustomerSegment = signal<'all' | 'high_value' | 'loyal' | 'frequent' | 'at_risk'>('all');
  
  // UI State
  showCustomerProfile = signal(false);
  selectedCustomer = signal<Customer | null>(null);
  searchQuery = signal('');

  ngOnInit(): void {
    this.loadCustomerMetrics();
    this.loadCustomers();
  }

  // ======== Data Loading Methods ========
  loadCustomerMetrics() {
    this.api.getCustomerMetrics().subscribe({
      next: (metrics) => this.customerMetrics.set(metrics),
      error: (e) => console.error('Failed to load customer metrics:', e)
    });
  }

  loadCustomers() {
    if (this.customersLoading()) return;
    this.customersLoading.set(true);
    const segment = this.selectedCustomerSegment();
    
    if (segment === 'all') {
      this.api.getCustomers(1, 50, 'all', this.searchQuery()).subscribe({
        next: (response: any) => {
          this.customers.set(response.customers || []);
          this.customersLoading.set(false);
        },
        error: (e) => {
          console.error('Failed to load customers:', e);
          this.customersLoading.set(false);
        }
      });
    } else {
      this.api.getCustomerSegment(segment).subscribe({
        next: (response) => {
          const segmentCustomers = (response.customers || []).map(c => ({
            customer_id: c.customer_id,
            name: c.name,
            email: c.email,
            phone: '',
            address: '',
            first_purchase_date: c.last_purchase,
            last_purchase_date: c.last_purchase,
            total_orders: c.total_orders,
            total_spent: c.total_spent,
            created_at: c.last_purchase
          })) as Customer[];
          
          this.customers.set(segmentCustomers);
          this.customersLoading.set(false);
        },
        error: (e) => {
          console.error('Failed to load customer segment:', e);
          this.customersLoading.set(false);
        }
      });
    }
  }

  // ======== UI Interaction Methods ========
  selectCustomerSegment(segment: 'all' | 'high_value' | 'loyal' | 'frequent' | 'at_risk') {
    this.selectedCustomerSegment.set(segment);
    this.customers.set([]);
    this.loadCustomers();
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    // Debounce search
    setTimeout(() => this.loadCustomers(), 300);
  }

  viewCustomerProfile(customerId: string) {
    this.api.getCustomer(customerId).subscribe({
      next: (customer) => {
        this.selectedCustomer.set(customer);
        this.showCustomerProfile.set(true);
      },
      error: (e) => {
        console.error('Failed to load customer profile:', e);
        alert('Failed to load customer profile');
      }
    });
  }

  closeCustomerProfile() {
    this.showCustomerProfile.set(false);
    this.selectedCustomer.set(null);
  }

  viewCustomerInsight(customerId: string) {
    this.api.getCustomerInsight(customerId).subscribe({
      next: (response) => {
        if (response.ok) {
          alert(`AI Insight for ${response.customer.name}:\n\n${response.insight}`);
        }
      },
      error: (e) => {
        console.error('Failed to generate customer insight:', e);
        alert('Failed to generate customer insight');
      }
    });
  }

  createCustomerCampaign(customer: Customer) {
    // Navigate to email campaigns with customer pre-selected
    this.router.navigate(['/admin/campaigns'], { 
      queryParams: { customerId: customer.customer_id, customerName: customer.name }
    });
  }

  // ======== Helper Methods ========
  getInitials(name: string): string {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getCustomerValueBadge(customer: Customer): string {
    const spent = customer.total_spent;
    const orders = customer.total_orders;
    
    if (orders >= 5 && spent >= 1000) {
      return 'bg-purple-100 text-purple-800 border border-purple-200';
    } else if (spent >= 1000) {
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    } else if (orders >= 3) {
      return 'bg-green-100 text-green-800 border border-green-200';
    }
    return 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  getCustomerValueLabel(customer: Customer): string {
    const spent = customer.total_spent;
    const orders = customer.total_orders;
    
    if (orders >= 5 && spent >= 1000) {
      return 'VIP';
    } else if (spent >= 1000) {
      return 'High Value';
    } else if (orders >= 3) {
      return 'Loyal';
    }
    return 'New';
  }

  formatDateShort(dateString: string): string {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kuala_Lumpur',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  formatMYR(value: number) {
    return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(value);
  }

  trackByCustomerId(_i: number, c: Customer) { 
    return c.customer_id; 
  }
}