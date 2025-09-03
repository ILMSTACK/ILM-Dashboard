import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';

import {
  CsvService, EmailCampaign
} from '../../../../services/insight/insight.service';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatProgressSpinnerModule,
    MatInputModule, MatTooltipModule, MatTabsModule, MatSelectModule
  ],
  templateUrl: './campaigns.component.html',
  styleUrls: ['./campaigns.component.scss']
})
export class CampaignsComponent implements OnInit {
  private api = inject(CsvService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Campaign Data
  emailCampaigns = signal<EmailCampaign[]>([]);
  campaignsLoading = signal(false);

  // Campaign Builder
  showCampaignBuilder = signal(false);
  selectedCampaignType = signal<'loyalty' | 'promotion' | 'winback' | 'custom' | null>(null);
  campaignForm = signal<any>({});

  // Pre-selected customer from navigation
  preSelectedCustomer = signal<{ id: string; name: string } | null>(null);

  ngOnInit(): void {
    this.loadEmailCampaigns();
    
    // Check if a customer was pre-selected from customer management
    this.route.queryParams.subscribe(params => {
      if (params['customerId'] && params['customerName']) {
        this.preSelectedCustomer.set({
          id: params['customerId'],
          name: params['customerName']
        });
        // Auto-open campaign builder for this customer
        this.openCustomEmailBuilder();
      }
    });
  }

  // ======== Data Loading Methods ========
  loadEmailCampaigns() {
    this.campaignsLoading.set(true);
    this.api.getEmailCampaigns(1, 50).subscribe({
      next: (response: any) => {
        this.emailCampaigns.set(response.campaigns || []);
        this.campaignsLoading.set(false);
      },
      error: (e) => {
        console.error('Failed to load email campaigns:', e);
        this.campaignsLoading.set(false);
      }
    });
  }

  // ======== Campaign Builder Methods ========
  openCampaignBuilder(type: 'loyalty' | 'promotion' | 'winback') {
    this.selectedCampaignType.set(type);
    this.showCampaignBuilder.set(true);
    this.resetCampaignForm(type);
  }

  openCustomEmailBuilder() {
    this.selectedCampaignType.set('custom');
    this.showCampaignBuilder.set(true);
    this.resetCampaignForm('custom');
  }

  closeCampaignBuilder() {
    this.showCampaignBuilder.set(false);
    this.selectedCampaignType.set(null);
    this.campaignForm.set({});
    this.preSelectedCustomer.set(null);
    
    // Remove query params
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {}
    });
  }

  resetCampaignForm(type: 'loyalty' | 'promotion' | 'winback' | 'custom') {
    const customer = this.preSelectedCustomer();
    const customerName = customer?.name || 'Customer';
    
    const templates = {
      loyalty: {
        name: 'VIP Customer Rewards',
        subject: 'Exclusive Rewards for Our Valued Customers!',
        discount_percent: 20,
        segment: 'loyal'
      },
      promotion: {
        name: 'Product Spotlight',
        subject: 'Special Deal on Your Favorite Items!',
        discount_percent: 15,
        segment: 'all'
      },
      winback: {
        name: 'We Miss You',
        subject: 'We Miss You! Come Back with a Special Offer',
        discount_percent: 25,
        segment: 'at_risk'
      },
      custom: {
        name: customer ? `Personal Message for ${customerName}` : 'Custom Newsletter',
        subject: customer ? `Special message for ${customerName.split(' ')[0]}!` : 'Update from our team',
        body: customer 
          ? `Dear ${customerName},\n\nWe appreciate your business and wanted to share something special with you. As one of our valued customers, you're eligible for exclusive deals and early access to new products.\n\nThank you for choosing us!\n\nBest regards,\nYour Business Team`
          : 'Hello! We wanted to share some exciting updates with you...',
        segment: customer ? 'individual' : 'all'
      }
    };
    
    this.campaignForm.set(templates[type]);
  }

  updateCampaignForm(field: string, event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const value = field === 'discount_percent' ? Number(target.value) : target.value;
    this.campaignForm.update(current => ({
      ...current,
      [field]: value
    }));
  }

  updateCampaignFormSelect(field: string, value: any) {
    this.campaignForm.update(current => ({
      ...current,
      [field]: value
    }));
  }

  getCampaignBuilderTitle(): string {
    const type = this.selectedCampaignType();
    const customer = this.preSelectedCustomer();
    
    if (customer && type === 'custom') {
      return `Send Email to ${customer.name}`;
    }
    
    const titles = {
      loyalty: 'Create VIP Rewards Campaign',
      promotion: 'Create Product Promotion',
      winback: 'Create Win-Back Campaign',
      custom: 'Send Custom Email'
    };
    return titles[type!] || 'Create Campaign';
  }

  getCampaignDescription(): string {
    const type = this.selectedCampaignType();
    const customer = this.preSelectedCustomer();
    
    if (customer && type === 'custom') {
      return `Send a personalized message directly to ${customer.name}.`;
    }
    
    const descriptions = {
      loyalty: 'Send exclusive offers to your most loyal customers who have made multiple purchases.',
      promotion: 'Promote specific products to customers who have shown interest in similar items.',
      winback: 'Re-engage customers who haven\'t purchased in a while with special offers.',
      custom: 'Send a personalized message to all your customers.'
    };
    return descriptions[type!] || '';
  }

  isValidCampaignForm(): boolean {
    const form = this.campaignForm();
    const type = this.selectedCampaignType();
    
    if (!form.name?.trim() || !form.subject?.trim()) return false;
    
    if (type === 'custom') {
      return !!form.body?.trim();
    } else {
      return form.discount_percent > 0 && form.discount_percent <= 50;
    }
  }

  createCampaignFromBuilder() {
    const form = this.campaignForm();
    const type = this.selectedCampaignType();
    
    if (!this.isValidCampaignForm()) return;
    
    if (type === 'custom') {
      const customer = this.preSelectedCustomer();
      const emailData: any = {
        subject: form.subject,
        body: form.body,
        segment: form.segment || 'all',
        sender_name: 'Your Business'
      };
      
      // If we have a pre-selected customer and using individual segment, add customer_id
      if (customer && form.segment === 'individual') {
        emailData.customer_id = customer.id;
      }
      
      this.api.sendCustomEmail(emailData).subscribe({
        next: (response) => {
          if (response.ok) {
            const customer = this.preSelectedCustomer();
            const message = customer 
              ? `Personal email sent to ${customer.name}!`
              : `Email sent successfully to ${response.targeted_customers} customers!`;
            alert(message);
            this.closeCampaignBuilder();
            this.loadEmailCampaigns();
          }
        },
        error: (e) => {
          console.error('Failed to send custom email:', e);
          alert('Failed to send email');
        }
      });
    } else if (type === 'loyalty') {
      this.api.createLoyaltyCampaign({
        name: form.name,
        subject: form.subject,
        discount_percent: form.discount_percent,
        min_orders: 3,
        min_spent: 500,
        template_vars: {
          promo_code: `VIP${form.discount_percent}`,
          expires: '2024-12-31'
        }
      }).subscribe({
        next: (response) => {
          if (response.ok) {
            alert(`Campaign "${response.name}" created successfully!`);
            this.closeCampaignBuilder();
            this.loadEmailCampaigns();
          }
        },
        error: (e) => {
          console.error('Failed to create loyalty campaign:', e);
          alert('Failed to create campaign');
        }
      });
    } else if (type === 'promotion') {
      this.api.createProductPromotion({
        name: form.name,
        subject: form.subject,
        product_filter: 'all',
        discount_percent: form.discount_percent,
        target_customers: 'all',
        template_vars: {
          discount: `${form.discount_percent}%`
        }
      }).subscribe({
        next: (response) => {
          if (response.ok) {
            alert(`Campaign "${response.name}" created successfully!`);
            this.closeCampaignBuilder();
            this.loadEmailCampaigns();
          }
        },
        error: (e) => {
          console.error('Failed to create promotion:', e);
          alert('Failed to create campaign');
        }
      });
    } else if (type === 'winback') {
      this.api.createWinBackCampaign({
        name: form.name,
        subject: form.subject,
        inactive_days: 90,
        discount_percent: form.discount_percent,
        template_vars: {
          promo_code: `COMEBACK${form.discount_percent}`
        }
      }).subscribe({
        next: (response) => {
          if (response.ok) {
            alert(`Campaign "${response.name}" created successfully!`);
            this.closeCampaignBuilder();
            this.loadEmailCampaigns();
          }
        },
        error: (e) => {
          console.error('Failed to create win-back campaign:', e);
          alert('Failed to create campaign');
        }
      });
    }
  }

  // ======== Campaign Management Methods ========
  viewCampaignStats(campaignId: number) {
    this.api.getCampaignStats(campaignId).subscribe({
      next: (stats) => {
        const s = stats.stats;
        const message = `Campaign: ${stats.campaign.name}\n\n` +
          `Recipients: ${s.total_recipients}\n` +
          `Sent: ${s.sent}\n` +
          `Delivered: ${s.delivered}\n` +
          `Opened: ${s.opened} (${(s.open_rate * 100).toFixed(1)}%)\n` +
          `Clicked: ${s.clicked} (${(s.click_rate * 100).toFixed(1)}%)`;
        alert(message);
      },
      error: (e) => {
        console.error('Failed to load campaign stats:', e);
        alert('Failed to load campaign statistics');
      }
    });
  }

  sendCampaign(campaignId: number) {
    const campaign = this.emailCampaigns().find(c => c.id === campaignId);
    if (!campaign) return;
    
    const confirmed = confirm(`Send campaign "${campaign.name}" to all recipients?`);
    if (!confirmed) return;
    
    this.api.sendCampaign(campaignId).subscribe({
      next: (response) => {
        if (response.ok) {
          alert(`Campaign sent successfully! Sent to ${response.sent_count} recipients.`);
          this.loadEmailCampaigns();
        }
      },
      error: (e) => {
        console.error('Failed to send campaign:', e);
        alert('Failed to send campaign');
      }
    });
  }

  // ======== Helper Methods ========
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getCampaignTypeIcon(type: string): string {
    const icons = {
      loyalty: 'card_giftcard',
      promotion: 'local_offer', 
      winback: 'refresh',
      event: 'email'
    };
    return icons[type as keyof typeof icons] || 'email';
  }

  getCampaignTypeColor(type: string): string {
    const colors = {
      loyalty: 'bg-blue-100 text-blue-800',
      promotion: 'bg-purple-100 text-purple-800',
      winback: 'bg-orange-100 text-orange-800',
      event: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  }

  trackByCampaignId(_i: number, c: EmailCampaign) { 
    return c.id; 
  }
}