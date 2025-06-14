export interface Dimensions {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface BoundingBox extends Position {
  width: number;
  height: number;
}

export class Stroll {
  private viewportSize: Dimensions;
  private originalImageSize: Dimensions;
  private zoomLevel: number;
  private speedLevel: number; // screen widths per second

  private scaledSize: Dimensions;
  private currentPosition: Position;
  private currentDirection: { dx: number; dy: number };

  constructor(
    viewportSize: Dimensions,
    originalImageSize: Dimensions,
    zoomLevel: number,
    speedLevel: number
  ) {
    this.viewportSize = {...viewportSize}; // Use a copy
    this.originalImageSize = originalImageSize; // Keep direct reference for stability in Stroll
    this.zoomLevel = Math.max(1, zoomLevel);
    this.speedLevel = speedLevel;

    this.scaledSize = this.calculateScaledSize();
    this.currentPosition = this.calculateInitialPosition();
  }

  private calculateScaledSize(): Dimensions {
    if (this.originalImageSize.width === 0 || this.originalImageSize.height === 0 || this.viewportSize.width === 0) {
      return { width: 0, height: 0 };
    }
    const aspectRatio = this.originalImageSize.width / this.originalImageSize.height;
    const scaledWidth = this.viewportSize.width * this.zoomLevel;
    const scaledHeight = scaledWidth / aspectRatio;
    return { width: scaledWidth, height: scaledHeight };
  }

  private calculateInitialPosition(): Position {
    const x = (this.viewportSize.width - this.scaledSize.width) / 2;
    const y = (this.viewportSize.height - this.scaledSize.height) / 2;
    return { x, y };
  }

  public updateSettings(
    newViewportSize?: Dimensions,
    newZoomLevel?: number,
    newSpeedLevel?: number,
    newOriginalImageSize?: Dimensions 
  ): void {
    let viewportChanged = false;
    let sceneDefiningPropertyChanged = false; 

    if (newViewportSize) {
      if(this.viewportSize.width !== newViewportSize.width || this.viewportSize.height !== newViewportSize.height) {
        this.viewportSize.width = newViewportSize.width;
        this.viewportSize.height = newViewportSize.height;
        viewportChanged = true;
      }
    }
    if (newZoomLevel !== undefined && this.zoomLevel !== newZoomLevel) {
      this.zoomLevel = Math.max(1, newZoomLevel);
      sceneDefiningPropertyChanged = true;
    }
    if (newSpeedLevel !== undefined && this.speedLevel !== newSpeedLevel) {
      this.speedLevel = newSpeedLevel;
      // No need to set sceneDefiningPropertyChanged for speed, as it doesn't change the scene itself
    }
    if (newOriginalImageSize && (this.originalImageSize.width !== newOriginalImageSize.width || this.originalImageSize.height !== newOriginalImageSize.height)) {
      this.originalImageSize = newOriginalImageSize; 
      sceneDefiningPropertyChanged = true;
    }

    const oldScaledWidth = this.scaledSize.width;
    const oldScaledHeight = this.scaledSize.height;
    const oldPositionX = this.currentPosition.x;
    const oldPositionY = this.currentPosition.y;
    
    const oldViewportForCentering = viewportChanged && newViewportSize ? newViewportSize : this.viewportSize;


    this.scaledSize = this.calculateScaledSize();

    if (sceneDefiningPropertyChanged || viewportChanged) {
      if (oldScaledWidth > 0 && oldScaledHeight > 0 && this.scaledSize.width > 0 && this.scaledSize.height > 0) {
        const visibleCenterXOldImgCoords = -oldPositionX + oldViewportForCentering.width / 2;
        const visibleCenterYOldImgCoords = -oldPositionY + oldViewportForCentering.height / 2;
        
        const ratioX = visibleCenterXOldImgCoords / oldScaledWidth;
        const ratioY = visibleCenterYOldImgCoords / oldScaledHeight;
        
        this.currentPosition.x = -(ratioX * this.scaledSize.width) + this.viewportSize.width / 2;
        this.currentPosition.y = -(ratioY * this.scaledSize.height) + this.viewportSize.height / 2;
      } else {
        this.currentPosition = this.calculateInitialPosition();
      }

      this.currentPosition.x = Math.min(0, Math.max(this.viewportSize.width - this.scaledSize.width, this.currentPosition.x));
      this.currentPosition.y = Math.min(0, Math.max(this.viewportSize.height - this.scaledSize.height, this.currentPosition.y));
    }

    this.afterUpdateSettings(
      sceneDefiningPropertyChanged,
      viewportChanged,
      newViewportSize,
      newZoomLevel,
      newSpeedLevel,
      newOriginalImageSize
    )
  }

  public afterUpdateSettings(
    sceneDefiningPropertyChanged: bool,
    viewportChanged: bool,
    newViewportSize?: Dimensions,
    newZoomLevel?: number,
    newSpeedLevel?: number,
    newOriginalImageSize?: Dimensions
  ): void {
    // Should be implemented in subclasses.
  }

  public tick(deltaTimeInSeconds: number): void {
    if (!this.isPannable()) {
      this.currentPosition = this.calculateInitialPosition(); 
      this.currentDirection = { dx: 0, dy: 0 };
      return;
    }
    this.currentPosition = this.getNextPositionForTick(deltaTimeInSeconds, this.currentPosition);
  }

  public getNextPositionForTick(deltaTimeInSeconds: number, position: Position): Position {
    // Should be implemented in subclasses.
    return position;
  }

  public getBoundingBox(): BoundingBox {
    return {
      x: this.currentPosition.x,
      y: this.currentPosition.y,
      width: this.scaledSize.width,
      height: this.scaledSize.height,
    };
  }

  public getViewportInOriginalImageScale(): BoundingBox {
    const scaleX = this.originalImageSize.width / this.scaledSize.width;
    const scaleY = this.originalImageSize.height / this.scaledSize.height;

    const originalX = -this.currentPosition.x * scaleX;
    const originalY = -this.currentPosition.y * scaleY;
    const originalWidth = this.viewportSize.width * scaleX;
    const originalHeight = this.viewportSize.height * scaleY;

    // Ensure coordinates are within original image bounds (should be the case if currentPosition is within bounds)
    // And dimensions are non-negative (should also be the case)
    return { x: originalX, y: originalY, width: originalWidth, height: originalHeight };
  }
  
  public isPannable(): boolean {
    const pannableX = this.scaledSize.width > this.viewportSize.width + 1e-3; // Add tolerance
    const pannableY = this.scaledSize.height > this.viewportSize.height + 1e-3; // Add tolerance
    return pannableX || pannableY;
  }

  public getScaledSize(): Dimensions {
    return this.scaledSize;
  }

  public getViewportSize(): Dimensions {
    return { ...this.viewportSize }; 
  }

  public getOriginalImageSize(): Dimensions {
    return this.originalImageSize; 
  }
}
