export const STORAGE_KEY = 'eksi_blocker_state';
export const PREFERENCES_STORAGE_KEY = 'eksi_blocker_preferences';

export enum BlockType {
    MUTE = 'u', // Sessiz alma
    BLOCK = 'm', // Engelleme
}

export const Endpoints = {
    BLOCK: 'https://eksisozluk.com/userrelation/addrelation',
    FAVORITES: 'https://eksisozluk.com/entry/favorileyenler',
    ADD_NOTE: 'https://eksisozluk.com/biri/{username}/note',
};