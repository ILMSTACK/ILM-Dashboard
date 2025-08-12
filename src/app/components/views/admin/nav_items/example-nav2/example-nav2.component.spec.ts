import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExampleNav2Component } from './example-nav2.component';

describe('ExampleNav2Component', () => {
  let component: ExampleNav2Component;
  let fixture: ComponentFixture<ExampleNav2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExampleNav2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExampleNav2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
