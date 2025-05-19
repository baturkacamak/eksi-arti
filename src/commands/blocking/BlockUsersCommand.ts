import { ICommand } from "../interfaces/ICommand";
import { IBlockUsersService } from "../../interfaces/services/IBlockUsersService";
import { BlockType } from "../../constants";
import { ILoggingService } from "../../interfaces/services/ILoggingService";

/**
 * Command for blocking users who favorited a specific entry
 */
export class BlockUsersCommand implements ICommand {
  private entryId: string;
  private blockType: BlockType;
  private wasExecuted: boolean = false;

  constructor(
    private blockUsersService: IBlockUsersService,
    private loggingService: ILoggingService,
    entryId: string,
    blockType: BlockType
  ) {
    this.entryId = entryId;
    this.blockType = blockType;
  }

  public async execute(): Promise<boolean> {
    try {
      this.blockUsersService.setBlockType(this.blockType);
      await this.blockUsersService.blockUsers(this.entryId);
      this.wasExecuted = true;
      return true;
    } catch (error) {
      this.loggingService.error("Error executing BlockUsersCommand:", error);
      return false;
    }
  }

  public canExecute(): boolean {
    return !this.blockUsersService.isBlockingInProgress();
  }

  public getDescription(): string {
    const actionType = this.blockType === BlockType.MUTE ? "sessiz al" : "engelle";
    return `Entry #${this.entryId} için favorileyenleri ${actionType}`;
  }
} 