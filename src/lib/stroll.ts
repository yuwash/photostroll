
interface Dimensions {
  width: number;
  height: number;
}

interface Position {
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
    this.currentDirection = this.calculateInitialDirection();
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

  private normalizeDirection(dx: number, dy: number): { dx: number; dy: number } {
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) {
      const randomAngle = Math.random() * 2 * Math.PI;
      return { dx: Math.cos(randomAngle), dy: Math.sin(randomAngle) };
    }
    return { dx: dx / length, dy: dy / length };
  }

  private calculateInitialDirection(): { dx: number; dy: number } {
    if (!this.isPannable()) {
      return { dx: 0, dy: 0 };
    }

    const viewCenterXOnImage = -this.currentPosition.x + this.viewportSize.width / 2;
    const viewCenterYOnImage = -this.currentPosition.y + this.viewportSize.height / 2;

    const targetXOnImage = Math.random() * this.scaledSize.width;
    const targetYOnImage = Math.random() * this.scaledSize.height;

    let dx = targetXOnImage - viewCenterXOnImage;
    let dy = targetYOnImage - viewCenterYOnImage;

    if (this.scaledSize.width <= this.viewportSize.width) dx = 0;
    if (this.scaledSize.height <= this.viewportSize.height) dy = 0;
    
    if (dx === 0 && dy === 0 && this.isPannable()) { 
        const randomAngle = Math.random() * 2 * Math.PI;
        if (this.scaledSize.width > this.viewportSize.width) dx = Math.cos(randomAngle);
        if (this.scaledSize.height > this.viewportSize.height) dy = Math.sin(randomAngle);
        if (dx === 0 && dy === 0) { 
            if (this.scaledSize.width > this.viewportSize.width) dx = (Math.random() > 0.5) ? 0.5 : -0.5;
            else if (this.scaledSize.height > this.viewportSize.height) dy = (Math.random() > 0.5) ? 0.5 : -0.5;
        }
    }
    return this.normalizeDirection(dx, dy);
  }

  private calculateNewDirectionAfterBounce(hitX: boolean, hitY: boolean): { dx: number; dy: number } {
    const canMoveX = this.scaledSize.width > this.viewportSize.width;
    const canMoveY = this.scaledSize.height > this.viewportSize.height;

    if (!canMoveX && !canMoveY) {
        return { dx: 0, dy: 0 };
    }

    let newDx = this.currentDirection.dx;
    let newDy = this.currentDirection.dy;

    const minXVal = this.viewportSize.width - this.scaledSize.width;
    const maxXVal = 0;
    const minYVal = this.viewportSize.height - this.scaledSize.height;
    const maxYVal = 0;

    if (hitX && canMoveX) {
        if (this.currentPosition.x >= maxXVal - 1e-3) { // Hit viewport's left edge
            newDx = -(Math.random() * 0.7 + 0.3); 
        }
        else if (this.currentPosition.x <= minXVal + 1e-3) { // Hit viewport's right edge
            newDx = (Math.random() * 0.7 + 0.3);  
        }
    }

    if (hitY && canMoveY) {
        if (this.currentPosition.y >= maxYVal - 1e-3) { // Hit viewport's top edge
            newDy = -(Math.random() * 0.7 + 0.3); 
        }
        else if (this.currentPosition.y <= minYVal + 1e-3) { // Hit viewport's bottom edge
            newDy = (Math.random() * 0.7 + 0.3);  
        }
    }
    
    // If only one wall was hit, fully randomize the component parallel to that wall.
    if (hitX && !hitY && canMoveY) { 
        newDy = (Math.random() * 2 - 1); // Random value between -1 and 1
    } else if (hitY && !hitX && canMoveX) { 
        newDx = (Math.random() * 2 - 1); // Random value between -1 and 1
    }
    // If both hitX and hitY (corner), the above newDx/newDy from perpendicular reflection is correct.

    if (!canMoveX) newDx = 0;
    if (!canMoveY) newDy = 0;

    // Fallback if direction becomes (0,0) but movement is possible
    if (newDx === 0 && newDy === 0 && (canMoveX || canMoveY)) {
        let attempts = 0;
        while(attempts < 10 && (newDx === 0 && newDy === 0)) { 
            const randomAngle = Math.random() * 2 * Math.PI;
            const cosAngle = Math.cos(randomAngle);
            const sinAngle = Math.sin(randomAngle);

            if (canMoveX) newDx = cosAngle; else newDx = 0;
            if (canMoveY) newDy = sinAngle; else newDy = 0;

            // Ensure minimum magnitude if only one direction is pannable to avoid getting stuck near zero
            if (canMoveX && !canMoveY && Math.abs(newDx) < 0.1) newDx = (newDx >= 0 ? 1 : -1) * (Math.random() * 0.5 + 0.5);
            if (canMoveY && !canMoveX && Math.abs(newDy) < 0.1) newDy = (newDy >= 0 ? 1 : -1) * (Math.random() * 0.5 + 0.5);
            attempts++;
        }
        
        if (newDx === 0 && newDy === 0) { // Final fallback if still stuck
            if (canMoveX) {
                 // If at viewport's left edge, must move image's x to decrease. If at right, must increase.
                newDx = (this.currentPosition.x >= maxXVal - 1e-3) ? -(Math.random()*0.5 + 0.3) : (Math.random()*0.5 + 0.3);
            }
            if (canMoveY) {
                // If at viewport's top edge, must move image's y to decrease. If at bottom, must increase.
                newDy = (this.currentPosition.y >= maxYVal - 1e-3) ? -(Math.random()*0.5 + 0.3) : (Math.random()*0.5 + 0.3);
            }
            if(!canMoveX) newDx = 0; // Redundant check, but safe
            if(!canMoveY) newDy = 0; // Redundant check, but safe
        }
    }
    return this.normalizeDirection(newDx, newDy);
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
    
    if (sceneDefiningPropertyChanged) { // If zoom or image changed, pick new direction
      this.currentDirection = this.calculateInitialDirection();
    } else if (viewportChanged) { // If only viewport changed, adjust direction if needed
      let { dx, dy } = this.currentDirection;
      if (this.scaledSize.width <= this.viewportSize.width) dx = 0;
      if (this.scaledSize.height <= this.viewportSize.height) dy = 0;
      
      if (dx !== this.currentDirection.dx || dy !== this.currentDirection.dy) {
        if (dx === 0 && dy === 0 && this.isPannable()) {
          this.currentDirection = this.calculateInitialDirection(); 
        } else {
          this.currentDirection = this.normalizeDirection(dx, dy);
        }
      }
      if (!this.isPannable()) { // If no longer pannable after viewport change
        this.currentDirection = { dx: 0, dy: 0 };
      }
    }
  }

  public tick(deltaTimeInSeconds: number): void {
    if (!this.isPannable()) {
      this.currentPosition = this.calculateInitialPosition(); 
      this.currentDirection = { dx: 0, dy: 0 };
      return;
    }
    if (this.currentDirection.dx === 0 && this.currentDirection.dy === 0 && this.isPannable()) {
        this.currentDirection = this.calculateInitialDirection();
        // If still (0,0) after trying to get initial direction, and it's pannable, it might be stuck.
        // This usually implies a bug in calculateInitialDirection or isPannable state.
        // For now, we proceed; if it remains (0,0), no movement will occur.
        if(this.currentDirection.dx === 0 && this.currentDirection.dy === 0 && this.isPannable()) return; 
    }
    
    const pixelsPerSecond = this.speedLevel * this.viewportSize.width;
    let nextX = this.currentPosition.x + this.currentDirection.dx * pixelsPerSecond * deltaTimeInSeconds;
    let nextY = this.currentPosition.y + this.currentDirection.dy * pixelsPerSecond * deltaTimeInSeconds;

    const minX = this.viewportSize.width - this.scaledSize.width;
    const maxX = 0;
    const minY = this.viewportSize.height - this.scaledSize.height;
    const maxY = 0;

    let bouncedX = false;
    let bouncedY = false;

    if (this.scaledSize.width > this.viewportSize.width) {
      if (nextX < minX) { nextX = minX; bouncedX = true; }
      else if (nextX > maxX) { nextX = maxX; bouncedX = true; }
    } else { // Not horizontally pannable, center it
      nextX = (this.viewportSize.width - this.scaledSize.width) / 2; 
    }

    if (this.scaledSize.height > this.viewportSize.height) {
      if (nextY < minY) { nextY = minY; bouncedY = true; }
      else if (nextY > maxY) { nextY = maxY; bouncedY = true; }
    } else { // Not vertically pannable, center it
      nextY = (this.viewportSize.height - this.scaledSize.height) / 2;
    }

    this.currentPosition = { x: nextX, y: nextY };

    if (bouncedX || bouncedY) {
      this.currentDirection = this.calculateNewDirectionAfterBounce(bouncedX, bouncedY);
    }
  }

  public getBoundingBox(): BoundingBox {
    return {
      x: this.currentPosition.x,
      y: this.currentPosition.y,
      width: this.scaledSize.width,
      height: this.scaledSize.height,
    };
  }
  
  public isPannable(): boolean {
    const pannableX = this.scaledSize.width > this.viewportSize.width + 1e-3; // Add tolerance
    const pannableY = this.scaledSize.height > this.viewportSize.height + 1e-3; // Add tolerance
    return pannableX || pannableY;
  }

  public getViewportSize(): Dimensions {
    return { ...this.viewportSize }; 
  }

  public getOriginalImageSize(): Dimensions {
    return this.originalImageSize; 
  }
}
