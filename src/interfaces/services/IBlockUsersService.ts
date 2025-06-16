import { BlockType } from "../../constants";

export interface BlockOperationRequest {
  entryId: string;
  blockType: BlockType;
  includeThreadBlocking: boolean;
  timestamp: number;
}

/**
 * Interface for the block users service
 */
export interface IBlockUsersService {
  setBlockType(type: BlockType): void;
  setThreadBlocking(enabled: boolean): void;
  getBlockTypeText(): string;
  loadState(): Promise<boolean>;
  saveState(): Promise<void>;
  clearState(): Promise<void>;
  fetchFavorites(entryId: string): Promise<string[]>;
  blockUsers(entryId: string): Promise<void>;
  isBlockingInProgress(): boolean;
  cancelOperation(): void;
  
  // Updated methods for merging operations
  addEntryToCurrentOperation(entryId: string, blockType: BlockType, includeThreadBlocking: boolean): Promise<boolean>;
  getCurrentOperationEntries(): string[];
  getCurrentOperationDetails(): { entryIds: string[], blockType: BlockType, includeThreadBlocking: boolean } | null;
}
