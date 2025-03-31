import { ResumeModal } from '../../components/resume-modal';
import { BlockerState } from '../../types';

export interface IResumeModalFactory {
    create(entryId: string, savedState: BlockerState): ResumeModal;
}
