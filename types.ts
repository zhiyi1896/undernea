
export interface UserPhoto {
  id: string;
  url: string;
}

export interface AppState {
  isStarted: boolean;
  isScattered: boolean;
  blessing: string;
  photos: UserPhoto[];
}
