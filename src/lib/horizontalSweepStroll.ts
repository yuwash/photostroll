import { Stroll } from './stroll';
import type { Dimensions, Position } from './stroll';

export class HorizontalSweepStroll extends Stroll {
  private currentDirectionX: number = 1; // 1 for right, -1 for left
  private currentDirectionY: number = 1; // 1 for down, -1 for up
  private yMoveRemaining: number = 0;

  public getNextPositionForTick(deltaTimeInSeconds: number, position: Position): Position {
    const pixelsPerSecond = this.speedLevel * this.viewportSize.width;
    let nextX = position.x;
    let nextY = position.y;

    const minX = this.viewportSize.width - this.scaledSize.width;
    const maxX = 0;
    const minY = this.viewportSize.height - this.scaledSize.height;
    const maxY = 0;

    if (this.yMoveRemaining === 0) {
      nextX += this.currentDirectionX * pixelsPerSecond * deltaTimeInSeconds;
    }

    if (this.scaledSize.width <= this.viewportSize.width) {
      nextX = (this.viewportSize.width - this.scaledSize.width) / 2;
    } else {
      if (nextX < minX) {
        nextX = minX;
        this.yMoveRemaining = this.viewportSize.height;
        this.currentDirectionX *= -1; // Reverse direction
      } else if (nextX > maxX) {
        nextX = maxX;
        this.yMoveRemaining = this.viewportSize.height;
        this.currentDirectionX *= -1; // Reverse direction
      }
    }

    if (this.scaledSize.height <= this.viewportSize.height) {
      nextY = (this.viewportSize.height - this.scaledSize.height) / 2;
    } else {
      if (this.yMoveRemaining > 0) {
        const yMove = Math.min(this.yMoveRemaining, pixelsPerSecond * deltaTimeInSeconds);
        nextY = position.y + this.currentDirectionY * yMove;
        this.yMoveRemaining -= yMove;

        if (nextY < minY) {
          nextY = minY;
          this.currentDirectionY = 1;
          this.yMoveRemaining = 0;
        } else if (nextY > maxY) {
          nextY = maxY;
          this.currentDirectionY = -1;
          this.yMoveRemaining = 0;
        }
      }
    }

    return { x: nextX, y: nextY };
  }
}
