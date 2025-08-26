import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotionService } from '../../../services/api/notion.service';
import { TestCase, Task } from '../../../services/api/business-automation.service';

@Component({
  selector: 'app-notion-integration',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notion-integration.component.html',
  styleUrl: './notion-integration.component.scss'
})
export class NotionIntegrationComponent implements OnInit, OnDestroy {
  @Input() type: 'testcase' | 'task' = 'testcase';
  @Input() data: TestCase | Task | null = null;
  @Input() userStoryId: number = 0;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() variant: 'primary' | 'secondary' | 'ghost' = 'secondary';
  @Input() showText: boolean = true;

  isAuthenticated: boolean = false;
  isLoading: boolean = false;
  isCreating: boolean = false;

  private authListener?: () => void;

  constructor(private notionService: NotionService) {}

  ngOnInit() {
    if (this.userStoryId) {
      this.checkNotionAuth();
    }

    // Listen for authentication success events
    this.authListener = () => {
      this.checkNotionAuth();
    };
    window.addEventListener('notionAuthSuccess', this.authListener);
  }

  ngOnDestroy() {
    // Clean up event listener
    if (this.authListener) {
      window.removeEventListener('notionAuthSuccess', this.authListener);
    }
  }

  checkNotionAuth() {
    this.isLoading = true;
    this.notionService.isNotionAuthenticated(this.userStoryId).subscribe({
      next: (response) => {
        this.isAuthenticated = response.authenticated;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error checking Notion auth:', error);
        this.isAuthenticated = false;
        this.isLoading = false;
      }
    });
  }

  handleNotionClick() {
    if (!this.isAuthenticated) {
      this.connectToNotion();
    } else {
      this.pushToNotion();
    }
  }

  connectToNotion() {
    // This will open Notion's OAuth page in a popup
    this.notionService.initiateNotionAuth(this.userStoryId);
  }

  pushToNotion() {
    if (!this.data || this.isCreating || !this.userStoryId) return;

    this.isCreating = true;
    
    if (this.type === 'testcase') {
      this.notionService.createTestCaseInNotion(this.data as TestCase, this.userStoryId).subscribe({
        next: (response) => {
          if (response.notion_url) {
            this.showSuccessMessage('Test case created successfully in Notion!', response.notion_url);
          }
          this.isCreating = false;
        },
        error: (error) => {
          console.error('Error creating test case in Notion:', error);
          this.isCreating = false;
        }
      });
    } else if (this.type === 'task') {
      this.notionService.createTaskInNotion(this.data as Task, this.userStoryId).subscribe({
        next: (response) => {
          if (response.notion_url) {
            this.showSuccessMessage('Task created successfully in Notion!', response.notion_url);
          }
          this.isCreating = false;
        },
        error: (error) => {
          console.error('Error creating task in Notion:', error);
          this.isCreating = false;
        }
      });
    }
  }

  private showSuccessMessage(message: string, notionUrl: string) {
    console.log(`${message} View in Notion: ${notionUrl}`);
    
    // Optional: Open Notion page in new tab
    if (confirm('Item created in Notion! Would you like to view it?')) {
      window.open(notionUrl, '_blank');
    }
  }

  get buttonText(): string {
    if (this.isCreating) {
      return this.type === 'testcase' ? 'Creating...' : 'Creating...';
    }
    
    if (!this.isAuthenticated) {
      return 'Connect Notion';
    }
    
    return 'Push to Notion';
  }

  get buttonTitle(): string {
    if (!this.isAuthenticated) {
      return 'Connect to Notion to sync your data';
    }
    
    const itemType = this.type === 'testcase' ? 'test case' : 'task';
    return `Push this ${itemType} to your Notion workspace`;
  }

  get buttonClass(): string {
    const baseClass = 'notion-btn';
    const sizeClass = `notion-btn-${this.size}`;
    const variantClass = `notion-btn-${this.variant}`;
    const stateClass = this.isAuthenticated ? 'authenticated' : 'not-authenticated';
    
    return `${baseClass} ${sizeClass} ${variantClass} ${stateClass}`;
  }
}