import { ToggleSwitchProps } from '../../components/shared/toggle-switch-component';

export interface IToggleSwitchComponent {
    create(props: ToggleSwitchProps): HTMLElement;
    setChecked(checked: boolean): void;
    isChecked(): boolean;
    setDisabled(disabled: boolean): void;
} 