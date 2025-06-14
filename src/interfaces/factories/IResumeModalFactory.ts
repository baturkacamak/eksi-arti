import { ResumeModal } from '../../components/features/resume-modal';
import { BlockerState } from '../../types';

export interface IResumeModalFactory {
    create(entryId: string, savedState: BlockerState): ResumeModal;
}
