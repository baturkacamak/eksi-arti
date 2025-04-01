import { BlockType } from "../../constants";

/**
 * Interface for the block users service
 */
export interface IBlockUsersService {
  /**
   * Set the block type (mute or block)
   */
  setBlockType(type: BlockType): void;

  /**
   * Block users who favorited a specific entry
   */
  blockUsers(entryId: string): Promise<void>;

  /**
   * Check if a blocking operation is currently in progress
   */
  isBlockingInProgress(): boolean;

  /**
   * Cancel the current blocking operation
   */
  cancelOperation(): void;
}
