# Design Document

## Overview

This design enhances the existing ILM Analytics Dashboard home component to integrate customer-centric analytics capabilities from MVP2. The enhancement will extend the current upload-based workflow to support customer data processing, segmentation, and email marketing while maintaining full backward compatibility with existing sales and inventory CSV uploads.

## Architecture

### Component Structure
The enhanced home component will maintain its current structure while adding new customer-focused sections:

```
HomeComponent
├── Existing Upload & Dashboard Logic (unchanged)
├── Customer Analytics Section (new)
├── Customer Segmentation Panel (new)
├── Email Campaign Management (new)
└── Enhanced Reporting with Customer Data (enhanced)
```

### Data Flow
1. **Enhanced CSV Detection**: Extend existing CSV type detection to identify customer data columns
2. **Customer Data Processing**: Process customer information during upload validation
3. **Customer Analytics**: Fetch and display customer metrics alongside existing KPIs
4. **Segmentation & Campaigns**: Provide customer targeting and email campaign functionality

## Components and Interfaces

### Enhanced Upload Response
Extend the existing `CsvUploadOk` interface to include customer data indicators:

```typescript
export interface EnhancedCsvUploadOk extends CsvUploadOk {
  format?: 'original' | 'enhanced';
  customers_processed?: number;
  purchases_created?: number;
}
```

### Customer Data Types
New interfaces for customer analytics:

```typescript
export interface CustomerMetrics {
  total_customers: number;
  new_customers: number;
  repeat_customers: number;
  churn_rate: number;
  avg_customer_value: number;
  avg_orders_per_customer: number;
}

export interface CustomerSegment {
  segment_type: 'loyal' | 'high_value' | 'frequent' | 'at_risk';
  count: number;
  total_value: number;
  avg_value: number;
}

export interface Customer {
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  total_orders: number;
  total_spent: number;
  first_purchase: string;
  last_purchase: string;
  segment?: string;
}

export interface EmailCampaign {
  campaign_id: number;
  campaign_type: 'loyalty' | 'product_promotion' | 'win_back';
  name: string;
  target_segment?: string;
  created_at: string;
  sent_at?: string;
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    open_rate: number;
    click_rate: number;
  };
}
```

### Enhanced Dashboard Response
Extend the existing `DashboardResponse` to include customer data:

```typescript
export interface EnhancedDashboardResponse extends DashboardResponse {
  format?: 'original' | 'enhanced';
  customer_metrics?: CustomerMetrics;
  customer_segments?: CustomerSegment[];
  top_customers?: Array<{
    customer_id: string;
    customer_name?: string;
    total_spent: number;
    total_orders: number;
  }>;
}
```

## Data Models

### Customer Analytics Service
Create a new service to handle customer-specific API calls based on MVP2 backend endpoints:

```typescript
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private base = '/csv'; // Same base as CsvService
  private emailBase = '/email'; // Email endpoints base
  
  // Customer data endpoints (from MVP2 spec)
  getCustomers(page = 1, limit = 50): Observable<{customers: Customer[], total: number}> {
    // GET /csv/customers?page=1&limit=50
  }
  
  getCustomerProfile(customerId: string): Observable<Customer> {
    // GET /csv/customers/{customer_id}
  }
  
  getCustomerPurchases(customerId: string): Observable<any[]> {
    // GET /csv/customers/{customer_id}/purchases
  }
  
  getCustomerSegments(segmentType: 'loyal' | 'high_value' | 'frequent' | 'at_risk'): Observable<Customer[]> {
    // GET /csv/customers/segments/{segment_type}
  }
  
  getUploadCustomerAnalysis(uploadId: number): Observable<any> {
    // GET /csv/dashboard/{upload_id}/customers
  }
  
  getCustomerMetrics(): Observable<CustomerMetrics> {
    // GET /csv/customers/metrics
  }
  
  getCustomerInsights(customerId: string): Observable<any> {
    // POST /csv/insight/customers/{customer_id}
  }
  
  // Email campaign endpoints (from MVP2 spec)
  getCampaigns(): Observable<EmailCampaign[]> {
    // GET /email/campaigns
  }
  
  getCampaignStats(campaignId: number): Observable<any> {
    // GET /email/campaigns/{campaign_id}/stats
  }
  
  createLoyaltyPromotion(data: {
    name: string;
    subject: string;
    template: string;
    target_segment?: string;
  }): Observable<EmailCampaign> {
    // POST /email/loyalty-promotion
  }
  
  createProductPromotion(data: {
    name: string;
    subject: string;
    template: string;
    product_filter?: string;
    target_segment?: string;
  }): Observable<EmailCampaign> {
    // POST /email/product-promotion
  }
  
  createWinBackCampaign(data: {
    name: string;
    subject: string;
    template: string;
    inactive_days?: number;
  }): Observable<EmailCampaign> {
    // POST /email/win-back
  }
  
  sendCampaign(campaignId: number): Observable<any> {
    // POST /email/send/{campaign_id}
  }
}
```

### Backend API Endpoints Integration
The service will integrate with these specific MVP2 endpoints:

#### Customer Endpoints
- `GET /csv/customers` - List all customers (paginated)
- `GET /csv/customers/{customer_id}` - Customer profile
- `GET /csv/customers/{customer_id}/purchases` - Purchase history
- `GET /csv/customers/segments/{segment_type}` - Customer segmentation
- `GET /csv/dashboard/{upload_id}/customers` - Upload-specific customer analysis
- `GET /csv/customers/metrics` - Overall customer KPIs
- `POST /csv/insight/customers/{customer_id}` - AI customer insights

#### Email Marketing Endpoints
- `GET /email/campaigns` - List campaigns
- `GET /email/campaigns/{campaign_id}/stats` - Campaign analytics
- `POST /email/loyalty-promotion` - Create loyalty campaign
- `POST /email/product-promotion` - Create product promotion
- `POST /email/win-back` - Create win-back campaign
- `POST /email/send/{campaign_id}` - Send campaign

#### Enhanced Upload Response
The existing upload endpoint will return enhanced format information:
```json
{
  "ok": true,
  "upload_id": 123,
  "format": "enhanced",
  "customers_processed": 15,
  "purchases_created": 45,
  "row_count": 45
}
```

### Enhanced CSV Detection
Extend the existing CSV type detection logic to identify enhanced format:

```typescript
private detectEnhancedFormat(headerLine: string): {
  isEnhanced: boolean;
  hasCustomerData: boolean;
  csvType: CsvType | 'unknown';
} {
  const cols = new Set(this.splitHeader(headerLine));
  
  // Check for customer columns
  const customerCols = ['customer_name', 'customer_email', 'customer_phone', 'customer_address'];
  const hasCustomerData = customerCols.some(col => cols.has(col));
  
  // Existing type detection logic
  const { type } = this.detectTypeFromHeader(headerLine);
  
  return {
    isEnhanced: hasCustomerData,
    hasCustomerData,
    csvType: type
  };
}
```

## Error Handling

### Graceful Degradation
- When customer data is not available, hide customer-specific UI elements
- Maintain full functionality for legacy CSV uploads
- Show appropriate messaging when customer features are not applicable

### Error States
- Handle customer API endpoint failures gracefully
- Provide fallback displays when customer data is unavailable
- Show loading states for customer data fetching

## Testing Strategy

### Unit Tests
- Test enhanced CSV detection logic
- Test customer service API calls
- Test UI component behavior with and without customer data
- Test backward compatibility with existing uploads

### Integration Tests
- Test complete upload workflow with enhanced CSV format
- Test customer analytics display and interaction
- Test email campaign creation and management
- Test report generation with customer data

### User Acceptance Tests
- Verify existing functionality remains unchanged
- Test new customer analytics features
- Verify email campaign workflow
- Test enhanced reporting capabilities

## Implementation Phases

### Phase 1: Service Layer Enhancement
1. Extend CsvService with customer detection
2. Create CustomerService for customer APIs
3. Update type definitions and interfaces

### Phase 2: UI Component Updates
1. Add customer analytics sections to home component
2. Implement customer segmentation display
3. Add email campaign management UI
4. Enhance existing KPI displays

### Phase 3: Integration & Testing
1. Integrate customer data with existing dashboard
2. Update report generation to include customer data
3. Test backward compatibility thoroughly
4. Implement error handling and loading states

### Phase 4: Polish & Optimization
1. Optimize customer data loading and caching
2. Enhance UI/UX for customer features
3. Add advanced customer insights
4. Performance optimization and testing