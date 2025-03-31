import { BlockOptionsModal } from '../../components/block-options-modal';

export interface IBlockOptionsModalFactory {
    create(entryId: string): BlockOptionsModal;
}
