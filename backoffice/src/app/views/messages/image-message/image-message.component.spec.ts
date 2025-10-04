import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageMessageComponent } from './image-message.component';

describe('ImageMessageComponent', () => {
  let component: ImageMessageComponent;
  let fixture: ComponentFixture<ImageMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageMessageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
