import { ICommand } from "../interfaces/ICommand";
import { IBlockUsersService } from '../../interfaces/services/features/blocking/IBlockUsersService';
import { BlockType } from "../../constants";
import { ILoggingService } from '../../interfaces/services/shared/ILoggingService';

/**
 * Command for blocking users who favorited a specific entry
 */
export class BlockUsersCommand implements ICommand {
  private entryId: string;
  private blockType: BlockType;
  private includeThreadBlocking: boolean;
  private wasExecuted: boolean = false;
  private wasAddedToOperation: boolean = false;

  constructor(
    private blockUsersService: IBlockUsersService,
    private loggingService: ILoggingService,
    entryId: string,
    blockType: BlockType,
    includeThreadBlocking: boolean = false
  ) {
    this.entryId = entryId;
    this.blockType = blockType;
    this.includeThreadBlocking = includeThreadBlocking;
  }

  public async execute(): Promise<boolean> {
    try {
      // If blocking is already in progress, try to add to current operation
      if (this.blockUsersService.isBlockingInProgress()) {
        this.loggingService.info(`Blocking already in progress, attempting to add entry ${this.entryId} to current operation`, {
          entryId: this.entryId,
          blockType: this.blockType,
          includeThreadBlocking: this.includeThreadBlocking
        });

        const added = await this.blockUsersService.addEntryToCurrentOperation(
          this.entryId, 
          this.blockType, 
          this.includeThreadBlocking
        );
        
        if (added) {
          this.wasAddedToOperation = true;
          this.loggingService.info(`Successfully added entry ${this.entryId} to current blocking operation`, {
            entryId: this.entryId,
            currentEntries: this.blockUsersService.getCurrentOperationEntries().length
          });
          return true;
        } else {
          this.loggingService.warn(`Failed to add entry ${this.entryId} to current operation`, {
            entryId: this.entryId,
            currentOperation: this.blockUsersService.getCurrentOperationDetails(),
            reason: 'incompatible_settings_or_duplicate'
          });
          return false;
        }
      }

      // If not blocking, execute immediately
      this.blockUsersService.setBlockType(this.blockType);
      this.blockUsersService.setThreadBlocking(this.includeThreadBlocking);
      await this.blockUsersService.blockUsers(this.entryId);
      this.wasExecuted = true;
      return true;
    } catch (error) {
      this.loggingService.error("Error executing BlockUsersCommand:", error);
      return false;
    }
  }

  public canExecute(): boolean {
    // Always return true now since we can merge operations
    return true;
  }

  public getDescription(): string {
    const actionType = this.blockType === BlockType.MUTE ? "sessiz al" : "engelle";
    const status = this.wasAddedToOperation ? " (mevcut işleme eklendi)" : this.wasExecuted ? " (tamamlandı)" : "";
    return `Yazı #${this.entryId} için favorileyenleri ${actionType}${status}`;
  }
} 