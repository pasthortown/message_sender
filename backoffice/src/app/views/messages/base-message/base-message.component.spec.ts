import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseMessageComponent } from './base-message.component';

describe('BaseMessageComponent', () => {
  let component: BaseMessageComponent;
  let fixture: ComponentFixture<BaseMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseMessageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
