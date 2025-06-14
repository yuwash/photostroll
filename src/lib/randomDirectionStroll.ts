import { Stroll } from './stroll';
import type { Dimensions, Position } from './stroll';

export class RandomDirectionStroll extends Stroll {
    constructor(
        viewportSize: Dimensions,
        originalImageSize: Dimensions,
        zoomLevel: number,
        speedLevel: number
    ) {
        super(viewportSize, originalImageSize, zoomLevel, speedLevel);
        this.currentDirection = this.calculateInitialDirection(this.getBoundingBox());
    }

  private normalizeDirection(dx: number, dy: number): { dx: number; dy: number } {
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) {
      const randomAngle = Math.random() * 2 * Math.PI;
      return { dx: Math.cos(randomAngle), dy: Math.sin(randomAngle) };
    }
    return { dx: dx / length, dy: dy / length };
  }

  private calculateInitialDirection(position: Position): { dx: number; dy: number } {
    if (!this.isPannable()) {
      return { dx: 0, dy: 0 };
    }

    const viewCenterXOnImage = -position.x + this.viewportSize.width / 2;
    const viewCenterYOnImage = -position.y + this.viewportSize.height / 2;

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

  private calculateNewDirectionAfterBounce(position: Position, hitX: boolean, hitY: boolean): { dx: number; dy: number } {
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
        if (position.x >= maxXVal - 1e-3) { // Hit viewport's left edge
            newDx = -(Math.random() * 0.7 + 0.3); 
        }
        else if (position.x <= minXVal + 1e-3) { // Hit viewport's right edge
            newDx = (Math.random() * 0.7 + 0.3);  
        }
    }

    if (hitY && canMoveY) {
        if (position.y >= maxYVal - 1e-3) { // Hit viewport's top edge
            newDy = -(Math.random() * 0.7 + 0.3); 
        }
        else if (position.y <= minYVal + 1e-3) { // Hit viewport's bottom edge
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
                newDx = (position.x >= maxXVal - 1e-3) ? -(Math.random()*0.5 + 0.3) : (Math.random()*0.5 + 0.3);
            }
            if (canMoveY) {
                // If at viewport's top edge, must move image's y to decrease. If at bottom, must increase.
                newDy = (position.y >= maxYVal - 1e-3) ? -(Math.random()*0.5 + 0.3) : (Math.random()*0.5 + 0.3);
            }
            if(!canMoveX) newDx = 0; // Redundant check, but safe
            if(!canMoveY) newDy = 0; // Redundant check, but safe
        }
    }
    return this.normalizeDirection(newDx, newDy);
  }

  public getNextPositionForTick(deltaTimeInSeconds: number, position: Position): Position {
    if (this.currentDirection.dx === 0 && this.currentDirection.dy === 0 && this.isPannable()) {
        this.currentDirection = this.calculateInitialDirection(position);
        // If still (0,0) after trying to get initial direction, and it's pannable, it might be stuck.
        // This usually implies a bug in calculateInitialDirection or isPannable state.
        // For now, we proceed; if it remains (0,0), no movement will occur.
        if(this.currentDirection.dx === 0 && this.currentDirection.dy === 0 && this.isPannable()) return; 
    }
    
    const pixelsPerSecond = this.speedLevel * this.viewportSize.width;
    let nextX = position.x + this.currentDirection.dx * pixelsPerSecond * deltaTimeInSeconds;
    let nextY = position.y + this.currentDirection.dy * pixelsPerSecond * deltaTimeInSeconds;

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

    const nextPosition = { x: nextX, y: nextY };

    if (bouncedX || bouncedY) {
      this.currentDirection = this.calculateNewDirectionAfterBounce(position, bouncedX, bouncedY);
    }
    return nextPosition;
  }

  public afterUpdateSettings(
    sceneDefiningPropertyChanged: bool,
    viewportChanged: bool,
    newViewportSize?: Dimensions,
    newZoomLevel?: number,
    newSpeedLevel?: number,
    newOriginalImageSize?: Dimensions
  ): void {
    if (sceneDefiningPropertyChanged) { // If zoom or image changed, pick new direction
      this.currentDirection = this.calculateInitialDirection(this.getBoundingBox());
    } else if (viewportChanged) { // If only viewport changed, adjust direction if needed
      let { dx, dy } = this.currentDirection;
      const scaledSize = this.getScaledSize();
      const viewportSize = this.getViewportSize();
      if (scaledSize.width <= viewportSize.width) dx = 0;
      if (scaledSize.height <= viewportSize.height) dy = 0;
      
      if (dx !== this.currentDirection.dx || dy !== this.currentDirection.dy) {
        if (dx === 0 && dy === 0 && this.isPannable()) {
          this.currentDirection = this.calculateInitialDirection(this.getBoundingBox());
        } else {
          this.currentDirection = this.normalizeDirection(dx, dy);
        }
      }
      if (!this.isPannable()) { // If no longer pannable after viewport change
        this.currentDirection = { dx: 0, dy: 0 };
      }
    }
  }

}
