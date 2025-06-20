import { ComponentContainer } from '../../../../components/shared/component-container';

export interface IContainerService {
    getEntryControlsContainer(entry: HTMLElement): ComponentContainer;
    getCustomControlsRow(): ComponentContainer;
    getSortButtonsContainerInCustomRow(): ComponentContainer;
    getSortButtonsContainer(parentElement: HTMLElement): ComponentContainer;
    getSearchControlsContainer(parentElement: HTMLElement): ComponentContainer;
    getSearchContainerInCustomRow(): ComponentContainer;
    resetSortButtonsContainer(): void;
    resetSearchControlsContainer(): void;
    removeEntryControlsContainer(entryId: string): void;
}
