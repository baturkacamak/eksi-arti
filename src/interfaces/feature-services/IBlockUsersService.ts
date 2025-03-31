import {BlockType} from "../../constants";

export interface IBlockUsersService {
    setBlockType(type: BlockType): void;
    getBlockTypeText(): string;
    loadState(): Promise<boolean>;
    saveState(): Promise<void>;
    clearState(): Promise<void>;
    fetchFavorites(entryId: string): Promise<string[]>;
    blockUsers(entryId: string): Promise<void>;
    isBlockingInProgress(): boolean;
    cancelOperation(): void;
}
