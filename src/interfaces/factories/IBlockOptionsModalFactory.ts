import { BlockOptionsModal } from '../../components/features/block-options-modal';

export interface IBlockOptionsModalFactory {
    create(entryId: string): BlockOptionsModal;
}
